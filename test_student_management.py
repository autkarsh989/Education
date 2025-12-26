#!/usr/bin/env python3
"""
Test script to verify teacher-student relationship functionality.
Run this from the backend directory: python test_student_management.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def create_test_student():
    """Create a test student user"""
    print("🧪 Creating test student...")
    
    data = {
        "username": "test_student",
        "password": "test123",
        "name": "Test Student",
        "class_level": "class_6"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Test student created successfully!")
            return True
        elif response.status_code == 400 and "already exists" in response.json().get("detail", ""):
            print("ℹ️  Test student already exists (that's okay)")
            return True
        else:
            print(f"❌ Failed to create student: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating student: {e}")
        return False

def create_test_teacher():
    """Create a test teacher"""
    print("\n🧪 Creating test teacher...")
    
    data = {
        "username": "test_teacher_2",
        "password": "test123",
        "name": "Test Teacher 2",
        "email": "teacher2@example.com",
        "bio": "Test teacher for student management"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/teachers/register", json=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Test teacher created successfully!")
            return True
        elif response.status_code == 400 and "already exists" in response.json().get("detail", ""):
            print("ℹ️  Test teacher already exists (that's okay)")
            return True
        else:
            print(f"❌ Failed to create teacher: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Error creating teacher: {e}")
        return False

def login_teacher():
    """Login as test teacher"""
    print("\n🧪 Logging in as teacher...")
    
    data = {
        "username": "test_teacher_2",
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/teachers/login", json=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Teacher login successful!")
            return result['access_token']
        else:
            print(f"❌ Teacher login failed: {response.json()}")
            return None
            
    except Exception as e:
        print(f"❌ Error logging in teacher: {e}")
        return None

def add_student_to_teacher(token):
    """Add student to teacher's list"""
    print("\n🧪 Adding student to teacher...")
    
    data = {
        "student_username": "test_student",
        "class_level": "class_6"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(f"{BASE_URL}/teachers/students/add", json=data, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Student added successfully! Relationship ID: {result['id']}")
            return True
        else:
            print(f"❌ Failed to add student: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Error adding student: {e}")
        return False

def get_teacher_students(token):
    """Get teacher's students"""
    print("\n🧪 Getting teacher's students...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/teachers/students", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            students = response.json()
            print(f"✅ Found {len(students)} students:")
            for student in students:
                print(f"  - {student['username']} ({student['name']}) - {student['class_level']}")
            return True
        else:
            print(f"❌ Failed to get students: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting students: {e}")
        return False

def get_student_teachers():
    """Get student's teachers"""
    print("\n🧪 Getting student's teachers...")
    
    try:
        response = requests.get(f"{BASE_URL}/teachers/my-teachers?student_username=test_student")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            teachers = response.json()
            print(f"✅ Student is enrolled with {len(teachers)} teachers:")
            for teacher_data in teachers:
                teacher = teacher_data['teacher']
                print(f"  - {teacher['name']} ({teacher['username']}) - {teacher_data['video_count']} videos")
            return True
        else:
            print(f"❌ Failed to get student's teachers: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting student's teachers: {e}")
        return False

def main():
    print("🚀 Testing Teacher-Student Management System")
    print("=" * 60)
    
    # Create test users
    student_created = create_test_student()
    teacher_created = create_test_teacher()
    
    if not (student_created and teacher_created):
        print("\n❌ Failed to create test users. Exiting.")
        return
    
    # Login as teacher
    token = login_teacher()
    if not token:
        print("\n❌ Failed to login as teacher. Exiting.")
        return
    
    # Add student to teacher
    add_success = add_student_to_teacher(token)
    
    # Get teacher's students
    get_students_success = get_teacher_students(token)
    
    # Get student's teachers
    get_teachers_success = get_student_teachers()
    
    print("\n" + "=" * 60)
    print("📊 Test Results:")
    print(f"Student Creation: {'✅' if student_created else '❌'}")
    print(f"Teacher Creation: {'✅' if teacher_created else '❌'}")
    print(f"Teacher Login: {'✅' if token else '❌'}")
    print(f"Add Student: {'✅' if add_success else '❌'}")
    print(f"Get Students: {'✅' if get_students_success else '❌'}")
    print(f"Get Teachers: {'✅' if get_teachers_success else '❌'}")
    
    if all([student_created, teacher_created, token, add_success, get_students_success, get_teachers_success]):
        print("\n🎉 All tests passed! Teacher-Student system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the backend logs for more details.")

if __name__ == "__main__":
    main()