#!/usr/bin/env python3
"""
Simple test script to verify the backend server is working.
"""

import asyncio
import websockets
import json
import sys

async def test_websocket():
    """Test WebSocket connection and basic message handling"""
    
    uri = "ws://localhost:8000/ws/test-session"
    
    try:
        print("🔌 Testing WebSocket connection...")
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Test message
            test_message = {
                "text": "Create a simple button"
            }
            
            print(f"📤 Sending test message: {test_message}")
            await websocket.send(json.dumps(test_message))
            
            # Wait for response
            print("⏳ Waiting for AI response...")
            response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
            
            print("📥 Received response:")
            response_data = json.loads(response)
            print(json.dumps(response_data, indent=2))
            
            if response_data.get("type") == "prototype":
                print("✅ Test successful! AI generated a prototype.")
            else:
                print("❌ Unexpected response format.")
                
    except websockets.exceptions.ConnectionRefused:
        print("❌ Connection refused. Is the server running?")
        print("   Run: python server.py")
        sys.exit(1)
    except asyncio.TimeoutError:
        print("❌ Timeout waiting for AI response.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

async def test_http_endpoints():
    """Test HTTP endpoints"""
    
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test root endpoint
            async with session.get("http://localhost:8000/") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Root endpoint: {data}")
                else:
                    print(f"❌ Root endpoint failed: {response.status}")
            
            # Test health endpoint
            async with session.get("http://localhost:8000/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Health endpoint: {data}")
                else:
                    print(f"❌ Health endpoint failed: {response.status}")
                    
    except Exception as e:
        print(f"❌ HTTP test failed: {e}")

async def main():
    """Run all tests"""
    print("🧪 Testing AI Prototype Builder Backend...")
    print("=" * 50)
    
    # Test HTTP endpoints first
    await test_http_endpoints()
    print()
    
    # Test WebSocket
    await test_websocket()
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
