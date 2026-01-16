from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging
from models.schemas import UserCreate, UserLogin, UserOut, UserUpdate
from models.models import User
from helper import get_db
from auth import create_access_token, verify_token, hash_password, verify_password
from datetime import timedelta

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# ---------------- Signup ----------------
@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    print(User.password)
    new_user = User(
        username=user.username,
        password=hash_password(user.password),  # Hash password for security
        name=user.name or user.username,
        level=user.level or 1,
        email=user.email,
        avatar=user.avatar,
        class_level=user.class_level,
        age=user.age,
        school=user.school,
    )
    print(new_user.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"New user registered: {user.username}")
    return new_user

# ---------------- OAuth2 Token Endpoint (for FastAPI Swagger UI) ----------------
@router.post("/token")
def get_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2-compliant token endpoint for FastAPI docs 'Authorize' button.
    
    This endpoint uses form data (username/password) as required by OAuth2.
    Use this with the 'Authorize' button in FastAPI docs.
    """
    logger.info(f"OAuth2 token request for user: {form_data.username}")
    db_user = db.query(User).filter(User.username == form_data.username).first()
    if not db_user:
        logger.warning(f"OAuth2 token request failed - user not found: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Support both hashed and plain text passwords for backward compatibility
    is_valid = False
    if db_user.password.startswith("$2b$"):
        is_valid = verify_password(form_data.password, db_user.password)
    else:
        is_valid = (db_user.password == form_data.password)
        if is_valid:
            logger.info(f"Upgrading plain text password to hashed for user: {form_data.username}")
            db_user.password = hash_password(form_data.password)
            db.commit()
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": db_user.username},
        expires_delta=timedelta(hours=1),
    )
    logger.info(f"Token generated for user (OAuth2): {form_data.username}")
    
    # OAuth2 spec requires this exact format
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# ---------------- Login ----------------
@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    logger.info(f"JSON login request for user: {data.username}")
    db_user = db.query(User).filter(User.username == data.username).first()
    if not db_user:
        logger.warning(f"JSON login failed - user not found: {data.username}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Support both hashed and plain text passwords for backward compatibility
    # Check if password is hashed (bcrypt hashes start with $2b$)
    is_valid = False
    if db_user.password.startswith("$2b$"):
        # Hashed password - use verify_password
        is_valid = verify_password(data.password, db_user.password)
    else:
        # Plain text password (legacy) - direct comparison
        is_valid = (db_user.password == data.password)
        # Optionally upgrade to hashed password on successful login
        if is_valid:
            logger.info(f"Upgrading plain text password to hashed for user: {data.username}")
            db_user.password = hash_password(data.password)
            db.commit()
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": db_user.username},
        expires_delta=timedelta(hours=1),
    )
    logger.info(f"User logged in: {data.username}")
    return {"access_token": access_token, "token_type": "bearer"}

# ---------------- Get current user ----------------
@router.get("/me", response_model=UserOut)
def get_user(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == username).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# ---------------- Update user ----------------
@router.put("/update", response_model=UserOut)
def update_user(
    updates: UserUpdate,
    username: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    db_user = db.query(User).filter(User.username == username).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        # Hash password if it's being updated
        if key == "password" and value:
            setattr(db_user, key, hash_password(value))
        else:
            setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    logger.info(f"User updated: {username}")
    return db_user
