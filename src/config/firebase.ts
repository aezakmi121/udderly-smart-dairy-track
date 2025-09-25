// Firebase configuration for push notifications
// TODO: Replace ALL values below with your actual Firebase project config
// Get these from: Firebase Console > Project Settings > General > Your apps
export const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com", 
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};

// VAPID key for push notifications (public key)
// TODO: Replace with your actual VAPID key from Firebase Console > Project Settings > Cloud Messaging
export const vapidKey = "YOUR_ACTUAL_VAPID_KEY_HERE";