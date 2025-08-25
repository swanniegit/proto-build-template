#!/usr/bin/env python3
"""
Test script for question parsing functionality
"""
import re

def _parse_user_intent(user_input: str) -> dict:
    """Parse user input to extract specific formatting and quantity requests"""
    intent = {
        "wants_numbered_list": False,
        "wants_bullet_points": False,
        "requested_count": None,
        "requested_format": None,
        "specific_request": None
    }
    
    user_lower = user_input.lower()
    
    # Check for specific number requests
    number_match = re.search(r'(\d+)\s+(concerns?|suggestions?|risks?|issues?|points?|items?|questions?)', user_lower)
    if number_match:
        intent["requested_count"] = int(number_match.group(1))
        intent["specific_request"] = number_match.group(2)
    
    # Check for format preferences
    if any(word in user_lower for word in ['bullet', 'bullets', 'list', 'numbered']):
        intent["wants_bullet_points"] = True
    if any(word in user_lower for word in ['numbered', 'number', 'count']):
        intent["wants_numbered_list"] = True
    
    # Check for specific request types
    if 'concerns' in user_lower:
        intent["specific_request"] = "concerns"
    elif 'suggestions' in user_lower:
        intent["specific_request"] = "suggestions"
    elif 'risks' in user_lower:
        intent["specific_request"] = "risks"
    elif 'issues' in user_lower:
        intent["specific_request"] = "issues"
    elif 'questions' in user_lower:
        intent["specific_request"] = "questions"
    
    return intent

def test_question_parsing():
    """Test various question parsing scenarios"""
    test_cases = [
        "ask 5 questions each",
        "ask 3 questions",
        "give me 5 questions about the requirements",
        "5 questions please",
        "ask questions",
        "what are 4 concerns?",
        "5 suggestions needed",
        "lets build a diary app"
    ]
    
    print("Testing question parsing functionality:")
    print("=" * 50)
    
    for test_input in test_cases:
        intent = _parse_user_intent(test_input)
        print(f"\nInput: '{test_input}'")
        print(f"Parsed intent: {intent}")
        
        if intent["requested_count"] and intent["specific_request"] == "questions":
            print(f"SUCCESS: Detected request for {intent['requested_count']} questions")
        elif intent["specific_request"] == "questions":
            print("SUCCESS: Detected question request (no count)")
        elif intent["requested_count"]:
            print(f"SUCCESS: Detected request for {intent['requested_count']} {intent['specific_request']}")
        else:
            print("No specific request detected")

if __name__ == "__main__":
    test_question_parsing()