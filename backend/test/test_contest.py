import json
import sys
import time

import requests


BASE_URL = "http://127.0.0.1:8000"


def pretty(payload):
    try:
        return json.dumps(payload.json(), indent=2)
    except Exception:
        return payload.text


def main():
    try:
        requests.get(BASE_URL, timeout=3)
    except requests.exceptions.RequestException:
        print("❌ FastAPI server not running at", BASE_URL)
        sys.exit(1)

    username = f"contest_student_{int(time.time())}"
    password = "pass1234"

    signup_payload = {
        "username": username,
        "name": "Contest Student",
        "password": password,
        "class_level": "class_6",
    }
    r = requests.post(f"{BASE_URL}/users/signup", json=signup_payload)
    print("signup:", r.status_code, pretty(r))
    if r.status_code not in (200, 201):
        sys.exit(2)

    login_payload = {"username": username, "password": password}
    r = requests.post(f"{BASE_URL}/users/login", json=login_payload)
    print("login:", r.status_code, pretty(r))
    if r.status_code != 200:
        sys.exit(3)

    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = requests.get(f"{BASE_URL}/contest/questions", headers=headers)
    print("questions:", r.status_code, pretty(r))
    if r.status_code != 200:
        sys.exit(4)

    payload = r.json()
    contest_id = payload["contest_id"]
    answers = {str(q["id"]): q["options"][0] for q in payload["questions"]}

    r = requests.post(
        f"{BASE_URL}/contest/submit",
        headers=headers,
        json={"contest_id": contest_id, "answers": answers},
    )
    print("submit:", r.status_code, pretty(r))
    if r.status_code != 200:
        sys.exit(5)

    attempt_id = r.json()["attempt_id"]
    r = requests.get(f"{BASE_URL}/contest/result/{attempt_id}", headers=headers)
    print("result:", r.status_code, pretty(r))
    if r.status_code != 200:
        sys.exit(6)

    r = requests.get(f"{BASE_URL}/contest/leaderboard", headers=headers)
    print("leaderboard:", r.status_code, pretty(r))
    if r.status_code != 200:
        sys.exit(7)

    print("\n✅ Contest module basic flow works")


if __name__ == "__main__":
    main()