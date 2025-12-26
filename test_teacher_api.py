#!/usr/bin/env python3
"""
Simple test script to verify teacher API endpoints are working.
Run this from the backend directory: python test_teacher_api.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_teacher_registration():
    """Test teacher registration endpoint"""
    print("🧪 Testing teacher registration...")
    
    data = {
        "username": "test_teacher",
        "password": "test123",
        "name": "Test Teacher",
        "email": "test@example.com",
        "bio": "Test teacher for API verification"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/teachers/register", json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Teacher registration successful!")
            return True
        elif response.status_code == 400 and "already exists" in response.json().get("detail", ""):
            print("ℹ️  Teacher already exists (that's okay)")
            return True
        else:
            print("❌ Teacher registration failed")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_teacher_login():
    """Test teacher login endpoint"""
    print("\n🧪 Testing teacher login...")
    
    data = {
        "username": "test_teacher",
        "password": "test123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/teachers/login", json=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Login successful! Token: {result['access_token'][:20]}...")
            return result['access_token']
        else:
            print(f"❌ Login failed: {response.json()}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_get_teachers_by_class():
    """Test getting teachers by class"""
    print("\n🧪 Testing get teachers by class...")
    
    try:
        response = requests.get(f"{BASE_URL}/teachers/class/class_6")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            teachers = response.json()
            print(f"✅ Found {len(teachers)} teachers for class_6")
            return True
        elif response.status_code == 404:
            print("ℹ️  No teachers found for class_6 (that's okay if no videos uploaded)")
            return True
        else:
            print(f"❌ Failed: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_teacher_profile(token):
    """Test getting teacher profile"""
    if not token:
        print("\n⏭️  Skipping profile test (no token)")
        return False
        
    print("\n🧪 Testing teacher profile...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/teachers/me", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            profile = response.json()
            print(f"✅ Profile retrieved! Teacher: {profile['name']}")
            return True
        else:
            print(f"❌ Failed: {response.json()}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 Testing Teacher Module API Endpoints")
    print("=" * 50)
    
    # Test registration
    reg_success = test_teacher_registration()
    
    # Test login
    token = test_teacher_login()
    
    # Test profile
    profile_success = test_teacher_profile(token)
    
    # Test class endpoint
    class_success = test_get_teachers_by_class()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"Registration: {'✅' if reg_success else '❌'}")
    print(f"Login: {'✅' if token else '❌'}")
    print(f"Profile: {'✅' if profile_success else '❌'}")
    print(f"Class Endpoint: {'✅' if class_success else '❌'}")
    
    if all([reg_success, token, profile_success, class_success]):
        print("\n🎉 All tests passed! Teacher API is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the backend setup.")

if __name__ == "__main__":
    main()