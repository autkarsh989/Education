from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import logging
from models.schemas import Message as MessageSchema, Chat as ChatSchema
from models.models import Chat, Message, User
from helper import get_db
import base64, uuid
import os, json
from pathlib import Path
import llm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

# Read from environment: True → user must be logged in, False → guest allowed
CHAT_AUTH_REQUIRED = os.getenv("CHAT_AUTH_REQUIRED", "true").lower() == "true"

@router.post("/send/instant/{username}")
def send_message_instant(
    username: str,
    message: MessageSchema,
    db: Session = Depends(get_db),
):
    """Send a message using username — return only bot's reply."""
    # --- Look up user ---
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user.id

    try:
        session_id = message.session_id or str(uuid.uuid4())

        # --- Find or create chat ---
        chat = db.query(Chat).filter(Chat.session_id == session_id).first()
        if not chat:
            chat = Chat(
                title=llm.get_chat_title(message.text),
                session_id=session_id,
                subject=message.subject,  # Store the selected subject
            )
            db.add(chat)
            db.commit()
            db.refresh(chat)
        elif not chat.subject and message.subject:
            # Update subject if it wasn't set before
            chat.subject = message.subject
            db.commit()
            db.refresh(chat)

        # --- Save user message ---
        user_msg = Message(
            text=message.text,
            image=message.image,
            sender="user",
            chat_id=chat.id,
            user_id=user_id,
        )
        db.add(user_msg)
        db.commit()

        # ✅ Update user's time metrics
        if message.time_taken and message.time_taken > 0:
            db.query(User).filter(User.id == user_id).update(
                {
                    User.total_time_taken: (func.coalesce(User.total_time_taken, 0.0) + (message.time_taken)/60),
                },
                synchronize_session=False,
            )
            db.commit()

        # Fetch previous messages for context
        previous_messages = (
            db.query(Message)
            .filter(Message.chat_id == chat.id)
            .order_by(desc(Message.id))
            .limit(6)
            .all()
        )
        previous_messages.reverse()
        last_context = "\n".join(
            [f"{msg.sender.capitalize()}: {msg.text}" for msg in previous_messages if msg.text]
        )

        # Generate hint with subject context
        if message.image:
            image_b64 = (
                message.image.split(",")[1]
                if message.image.startswith("data:")
                else message.image
            )
            bot_text = llm.generate_hint(
                question=message.text,
                last_context=last_context,
                image_b64=image_b64,
                user_class=user.class_level or user.level,
                subject=chat.subject,  # Pass the subject
                parent_feedback=getattr(user, "Parent_feedback", None),
            )
        else:
            bot_text = llm.generate_hint(
                question=message.text,
                last_context=last_context,
                user_class=user.class_level or user.level,
                subject=chat.subject,  # Pass the subject
                parent_feedback=getattr(user, "Parent_feedback", None),
            )

        logger.info(f"Generated bot response for send_message_instant for subject: {chat.subject}")

        # --- Save bot reply ---
        bot_msg = Message(
            text=bot_text,
            sender="bot",
            chat_id=chat.id,
        )
        db.add(bot_msg)
        db.commit()

        # Return only current interaction
        return {
            "bot_message": {
                "text": bot_msg.text,
                "sender": bot_msg.sender,
                "session_id": session_id,
            }
        }

    except Exception as e:
        logger.error(f"Error in send_message_instant: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send/{username}", response_model=ChatSchema)
def send_message_by_username(
    username: str,
    message: MessageSchema,
    db: Session = Depends(get_db),
):
    """
    Send a message using the username instead of user_id.
    Backend looks up user_id from username.
    """

    # --- Look up user_id from username ---
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user.id

    try:
        session_id = message.session_id or str(uuid.uuid4())

        # --- Find or create chat ---
        chat = db.query(Chat).filter(Chat.session_id == session_id).first()
        if not chat:
            chat = Chat(
                title=llm.get_chat_title(message.text),
                session_id=session_id,
                subject=message.subject,  # Store the selected subject
            )
            db.add(chat)
            db.commit()
            db.refresh(chat)
        elif not chat.subject and message.subject:
            # Update subject if it wasn't set before
            chat.subject = message.subject
            db.commit()
            db.refresh(chat)

        # --- Save user message ---
        user_msg = Message(
            text=message.text,
            image=message.image,
            sender="user",
            chat_id=chat.id,
            user_id=user_id,
        )
        db.add(user_msg)
        db.commit()

        # --- Fetch previous 6 messages as context ---
        previous_messages = (
            db.query(Message)
            .filter(Message.chat_id == chat.id)
            .order_by(desc(Message.id))
            .limit(6)
            .all()
        )

        # Reverse so oldest first
        previous_messages.reverse()
        # Combine messages into readable context text
        last_context = "\n".join(
            [f"{msg.sender.capitalize()}: {msg.text}" for msg in previous_messages if msg.text]
        )

        # Generate hint with subject context
        if message.image:
            # Extract base64 cleanly (support both with/without 'data:' prefix)
            image_b64 = (
                message.image.split(",")[1]
                if message.image.startswith("data:")
                else message.image
            )
            bot_text = llm.generate_hint(
                question=message.text,
                last_context=last_context,
                image_b64=image_b64,
                user_class=user.class_level or user.level,
                subject=chat.subject,  # Pass the subject
                parent_feedback=getattr(user, "Parent_feedback", None),
            )
        else:
            bot_text = llm.generate_hint(
                question=message.text,
                last_context=last_context,
                user_class=user.class_level or user.level,
                subject=chat.subject,  # Pass the subject
                parent_feedback=getattr(user, "Parent_feedback", None),
            )

        logger.info(f"Generated bot response for user {username} with subject: {chat.subject}")

        # --- Save bot reply ---
        bot_msg = Message(
            text=bot_text,
            sender="bot",
            chat_id=chat.id,
        )
        db.add(bot_msg)
        db.commit()
        db.refresh(chat)

        return chat

    except Exception as e:
        logger.error(f"Error in send_message_by_username: {e}", exc_info=True)
        db.rollback()
        raise e


@router.get("/user/{username}", response_model=list[ChatSchema])
def get_chats_by_username(username: str, db: Session = Depends(get_db)):
    """Get all chats for a user."""
    # Find user by username
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    chats = (
        db.query(Chat)
        .join(Message)
        .filter(Message.user_id == user.id, Message.sender == "user")
        .order_by(desc(Chat.id))
        .all()
    )
    return chats


@router.get("/session/{session_id}", response_model=list[ChatSchema])
def get_chats_by_session(session_id: str, db: Session = Depends(get_db)):
    """Get chats by session_id."""
    chats = db.query(Chat).filter(Chat.session_id == session_id).all()
    if not chats:
        raise HTTPException(status_code=404, detail="No chats for this session")
    return chats


@router.post("/send/check/{username}")
def check_message_instant(
    username: str,
    message: MessageSchema,
    db: Session = Depends(get_db),
):
    """
    Send a message and generate a hint response.
    Scoring logic has been removed - focus is on learning guidance.
    """
    # --- Look up user ---
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user.id

    try:
        session_id = message.session_id or str(uuid.uuid4())

        # --- Find or create chat ---
        chat = db.query(Chat).filter(Chat.session_id == session_id).first()
        if not chat:
            chat = Chat(
                title=llm.get_chat_title(message.text),
                session_id=session_id,
                subject=message.subject,  # Store the selected subject
            )
            db.add(chat)
            db.commit()
            db.refresh(chat)
        elif not chat.subject and message.subject:
            # Update subject if it wasn't set before
            chat.subject = message.subject
            db.commit()
            db.refresh(chat)

        # --- Save user message ---
        user_msg = Message(
            text=message.text,
            image=message.image,
            sender="user",
            chat_id=chat.id,
            user_id=user_id,
        )
        db.add(user_msg)
        db.commit()

        # ✅ Update user's time metrics
        if message.time_taken and message.time_taken > 0:
            db.query(User).filter(User.id == user_id).update(
                {
                    User.total_time_taken: (func.coalesce(User.total_time_taken, 0.0) + (message.time_taken)/60),
                },
                synchronize_session=False,
            )
            db.commit()

        # Fetch previous messages for context
        previous_messages = (
            db.query(Message)
            .filter(Message.chat_id == chat.id)
            .order_by(desc(Message.id))
            .limit(6)
            .all()
        )
        previous_messages.reverse()
        last_context = "\n".join(
            [f"{msg.sender.capitalize()}: {msg.text}" for msg in previous_messages if msg.text]
        )

        # Generate hint response
        if message.image:
            image_b64 = (
                message.image.split(",")[1]
                if message.image.startswith("data:")
                else message.image
            )
            bot_text = llm.generate_hint(
                question=message.text,
                last_context=last_context,
                image_b64=image_b64,
                user_class=user.class_level or user.level,
                subject=chat.subject,  # Pass the subject
                parent_feedback=getattr(user, "Parent_feedback", None),
            )
        else:
            bot_text = llm.generate_hint(
                question=message.text,
                last_context=last_context,
                user_class=user.class_level or user.level,
                subject=chat.subject,  # Pass the subject
                parent_feedback=getattr(user, "Parent_feedback", None),
            )

        logger.info(f"Generated bot response for user {username} with subject: {chat.subject}")

        # --- Save bot reply ---
        bot_msg = Message(
            text=bot_text,
            sender="bot",
            chat_id=chat.id,
        )
        db.add(bot_msg)
        db.commit()

        # Return only current interaction
        return {
            "bot_message": {
                "text": bot_msg.text,
                "sender": bot_msg.sender,
                "session_id": session_id,
            }
        }

    except Exception as e:
        logger.error(f"Error in check_message_instant: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
