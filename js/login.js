// Import Firebase Auth Functions
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

// Initialize Firebase Auth
const auth = getAuth();

// Handle Sign-Up
document.querySelector(".sign-up-container form").addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent default form submission

  const email = document.querySelector('.sign-up-container input[name="email"]').value;
  const password = document.querySelector('.sign-up-container input[name="password"]').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User signed up:", userCredential.user);
    alert("Sign Up Successful!");
    
    // Redirect to main page
    window.location.href = "https://poliiglot.com/index.html";
    // window.location.href = "https://poliiglot.com/lingo-hub";
  } catch (error) {
    console.error("Error signing up:", error.code, error.message);
    alert(`Error: ${error.message}`);
  }
});

// Handle Sign-In
document.querySelector(".sign-in-container form").addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent default form submission

  const email = document.querySelector('.sign-in-container input[name="email"]').value;
  const password = document.querySelector('.sign-in-container input[name="password"]').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User logged in:", userCredential.user);
    alert("Log In Successful!");
    
    // Redirect to main page
    window.location.href = "https://poliiglot.com/index.html";
  } catch (error) {
    console.error("Error logging in:", error.code, error.message);
    alert(`Error: ${error.message}`);
  }
});

// Login movement
document.addEventListener('DOMContentLoaded', () => {
  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');
  const container = document.getElementById('container');

  signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
  });

  signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
  });
});
