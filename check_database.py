#!/usr/bin/env python3
"""
Simple script to check what's in the teacher_students table.
Run this from the backend directory: python check_database.py
"""

import sqlite3
import os

def check_database():
    """Check the contents of the database"""
    db_path = "app.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file 'app.db' not found!")
        print("Make sure you're running this from the backend directory.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔍 Checking database contents...")
        print("=" * 50)
        
        # Check if teacher_students table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='teacher_students';")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("❌ teacher_students table does not exist!")
            print("The table should be created automatically when you start the backend.")
            return
        
        print("✅ teacher_students table exists")
        
        # Check table structure
        cursor.execute("PRAGMA table_info(teacher_students);")
        columns = cursor.fetchall()
        print("\n📋 Table structure:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        # Check teachers table
        cursor.execute("SELECT id, username, name FROM teachers;")
        teachers = cursor.fetchall()
        print(f"\n👨‍🏫 Teachers ({len(teachers)}):")
        for teacher in teachers:
            print(f"  - ID: {teacher[0]}, Username: {teacher[1]}, Name: {teacher[2]}")
        
        # Check users table
        cursor.execute("SELECT username, name FROM users;")
        users = cursor.fetchall()
        print(f"\n👨‍🎓 Students/Users ({len(users)}):")
        for user in users:
            print(f"  - Username: {user[0]}, Name: {user[1]}")
        
        # Check teacher-student relationships
        cursor.execute("""
            SELECT ts.id, ts.teacher_id, ts.student_username, ts.class_level, ts.enrolled_date,
                   t.name as teacher_name, u.name as student_name
            FROM teacher_students ts
            LEFT JOIN teachers t ON ts.teacher_id = t.id
            LEFT JOIN users u ON ts.student_username = u.username;
        """)
        relationships = cursor.fetchall()
        
        print(f"\n🔗 Teacher-Student Relationships ({len(relationships)}):")
        if relationships:
            for rel in relationships:
                print(f"  - ID: {rel[0]}")
                print(f"    Teacher: {rel[5]} (ID: {rel[1]})")
                print(f"    Student: {rel[6]} (@{rel[2]})")
                print(f"    Class: {rel[3]}")
                print(f"    Enrolled: {rel[4]}")
                print()
        else:
            print("  No relationships found.")
        
        conn.close()
        
        print("=" * 50)
        print("✅ Database check complete!")
        
        if not relationships:
            print("\n💡 If you're having trouble adding students:")
            print("1. Make sure the student username exists in the users table")
            print("2. Make sure the teacher is logged in correctly")
            print("3. Check the backend console for error messages")
            print("4. Try the test script: python test_student_management.py")
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    check_database()