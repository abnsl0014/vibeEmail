#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

class VoiceOverlayAPITester:
    def __init__(self, base_url="https://d77ac93d-1613-4c82-a20a-3e39cf932e50.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status=200, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        self.log(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    self.log(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Raw response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - Exception: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        self.log("\n=== Testing Health Endpoint ===")
        success, response = self.run_test("Health Check", "GET", "health")
        if success:
            # Validate response structure
            required_fields = ['status', 'asr_loaded', 'llm_loaded']
            for field in required_fields:
                if field not in response:
                    self.log(f"⚠️  Missing field in health response: {field}")
                else:
                    self.log(f"   {field}: {response[field]}")
        return success

    def test_models_status(self):
        """Test /api/models/status endpoint"""
        self.log("\n=== Testing Models Status ===")
        success, response = self.run_test("Models Status", "GET", "models/status")
        if success:
            # Validate response structure
            if 'asr' in response and 'llm' in response:
                asr = response['asr']
                llm = response['llm']
                self.log(f"   ASR Model: {asr.get('name', 'Unknown')} - Downloaded: {asr.get('downloaded', False)}, Loaded: {asr.get('loaded', False)}")
                self.log(f"   LLM Model: {llm.get('name', 'Unknown')} - Downloaded: {llm.get('downloaded', False)}, Loaded: {llm.get('loaded', False)}")
        return success

    def test_intent_parsing(self):
        """Test /api/intent/parse endpoint"""
        self.log("\n=== Testing Intent Parsing ===")
        
        # Test valid email command
        test_cases = [
            {
                "name": "Email Command",
                "text": "Email Sarah about rescheduling the meeting to Friday",
                "expected_action": "email"
            },
            {
                "name": "Mail Command",
                "text": "Send mail to John regarding the project update",
                "expected_action": "email"
            },
            {
                "name": "Unknown Command",
                "text": "Play some music",
                "expected_action": "unknown"
            }
        ]
        
        all_passed = True
        for case in test_cases:
            success, response = self.run_test(
                f"Intent Parse - {case['name']}", 
                "POST", 
                "intent/parse",
                200,
                {"text": case["text"]}
            )
            if success:
                action = response.get('action')
                if action == case['expected_action']:
                    self.log(f"   ✅ Action correctly identified: {action}")
                    if action == 'email':
                        self.log(f"   To: {response.get('to', 'N/A')}")
                        self.log(f"   Subject: {response.get('subject', 'N/A')}")
                        self.log(f"   Confidence: {response.get('confidence', 'N/A')}")
                else:
                    self.log(f"   ⚠️  Expected action '{case['expected_action']}', got '{action}'")
            else:
                all_passed = False
        
        return all_passed

    def test_email_drafting(self):
        """Test /api/email/draft endpoint"""
        self.log("\n=== Testing Email Drafting ===")
        
        draft_request = {
            "action": "email",
            "to": "Sarah",
            "subject": "rescheduling the meeting",
            "body_hint": "rescheduling the meeting to Friday"
        }
        
        success, response = self.run_test(
            "Email Draft", 
            "POST", 
            "email/draft",
            200,
            draft_request
        )
        
        if success:
            # Validate response structure
            required_fields = ['to', 'subject', 'body']
            for field in required_fields:
                if field in response:
                    self.log(f"   {field}: {response[field][:50]}{'...' if len(str(response[field])) > 50 else ''}")
                else:
                    self.log(f"   ⚠️  Missing field: {field}")
        
        return success

    def test_gmail_status(self):
        """Test /api/gmail/status endpoint"""
        self.log("\n=== Testing Gmail Status ===")
        success, response = self.run_test("Gmail Status", "GET", "gmail/status")
        if success:
            self.log(f"   Connected: {response.get('connected', False)}")
            self.log(f"   Has Client Config: {response.get('has_client_config', False)}")
            self.log(f"   Email: {response.get('email', 'None')}")
        return success

    def test_email_sending(self):
        """Test /api/email/send endpoint"""
        self.log("\n=== Testing Email Sending (Demo Mode) ===")
        
        email_data = {
            "to": "test@example.com",
            "subject": "Test Email from Voice Overlay",
            "body": "This is a test email sent from the Voice Overlay app in demo mode."
        }
        
        success, response = self.run_test(
            "Email Send", 
            "POST", 
            "email/send",
            200,
            email_data
        )
        
        if success:
            self.log(f"   Status: {response.get('status', 'Unknown')}")
            self.log(f"   Message ID: {response.get('message_id', 'None')}")
            if response.get('demo'):
                self.log(f"   ✅ Demo mode confirmed")
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting Voice Overlay API Tests")
        self.log(f"Backend URL: {self.base_url}")
        
        tests = [
            self.test_health_endpoint,
            self.test_models_status,
            self.test_gmail_status,
            self.test_intent_parsing,
            self.test_email_drafting,
            self.test_email_sending
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log(f"❌ Test failed with exception: {str(e)}")
                self.failed_tests.append({
                    "test": test.__name__,
                    "error": str(e)
                })
        
        # Print summary
        self.log(f"\n📊 Test Summary")
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Tests failed: {len(self.failed_tests)}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "No tests run")
        
        if self.failed_tests:
            self.log(f"\n❌ Failed Tests:")
            for failure in self.failed_tests:
                self.log(f"   - {failure}")
        
        return len(self.failed_tests) == 0

def main():
    tester = VoiceOverlayAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())