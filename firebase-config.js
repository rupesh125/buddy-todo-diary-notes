// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBh49v3-8sw_KVPZ4aHbiX8dI1Wkd4_hm8",
  authDomain: "buddy-todo-396ba.firebaseapp.com",
  projectId: "buddy-todo-396ba",
  storageBucket: "buddy-todo-396ba.appspot.com",
  messagingSenderId: "829043889745",
  appId: "1:829043889745:web:7c162b2e7526424873ca70",
  measurementId: "G-8SMRMCXG9N"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
