// Test script to verify Twilio integration
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://daiimiznlkffbbadhodw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaWltaXpubGtmZmJiYWRob2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzQsImV4cCI6MjA1MDU0ODk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
);

async function testTwilioIntegration() {
  console.log('🧪 Testing Twilio Integration...');
  
  try {
    // Test 1: Send OTP via SMS
    console.log('\n📱 Test 1: Sending OTP via SMS...');
    const smsResult = await supabase.functions.invoke('send-otp', {
      body: { 
        phoneNumber: '+1234567890', // Replace with a real test number
        name: 'Test User'
      }
    });
    
    console.log('SMS Result:', smsResult);
    
    // Test 2: Send OTP via Email
    console.log('\n📧 Test 2: Sending OTP via Email...');
    const emailResult = await supabase.functions.invoke('send-otp', {
      body: { 
        email: 'test@example.com', // Replace with a real test email
        name: 'Test User'
      }
    });
    
    console.log('Email Result:', emailResult);
    
    console.log('\n✅ Twilio integration test completed!');
    console.log('📝 Note: Check the Supabase dashboard logs for detailed results.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTwilioIntegration(); 