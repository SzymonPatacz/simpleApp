// Import stylesheets
//import './style.css';
// Firebase App (the core Firebase SDK) is always required
import { initializeApp } from 'firebase/app';

// Add the Firebase products and methods that you want to use
import {
  getAuth,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

import {
  getFirestore,
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';


import * as firebaseui from 'firebaseui';

// Document elements
const startLoginButton = document.getElementById('startLogin');
const guestbookContainer = document.getElementById('guestbook-container');
const descriptionContainer = document.getElementById('description-container');
// Adding messages
const form = document.getElementById('leave-message');
const input = document.getElementById('message');
// Adding images
var imageButtonElement = document.getElementById('submitImage');
var imageFormElement = document.getElementById('image-form');
var mediaCaptureElement = document.getElementById('mediaCapture');
 // A loading image URL.
 var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';

const guestbook = document.getElementById('guestbook');
//const numberAttending = document.getElementById('number-attending');
//const rsvpYes = document.getElementById('rsvp-yes');
//const rsvpNo = document.getElementById('rsvp-no');

let rsvpListener = null;
let guestbookListener = null;

let db, auth;

async function main() {
  // Add Firebase project configuration object here
  const firebaseConfig = {
    apiKey: "AIzaSyAdoE8G-rjDrqFVxnJgyXo9Mb96TwSCOQo",
    authDomain: "simpleapp-7e9f4.firebaseapp.com",
    projectId: "simpleapp-7e9f4",
    storageBucket: "simpleapp-7e9f4.appspot.com",
    messagingSenderId: "808591446386",
    appId: "1:808591446386:web:f1103d3e144cae9eff4deb"
};

  // Make sure Firebase is initilized
  try {
    if (firebaseConfig && firebaseConfig.apiKey) {
      initializeApp(firebaseConfig);
    }
    db = getFirestore();
    auth = getAuth();
  } catch (e) {
    console.log('error:', e);
    document.getElementById('app').innerHTML =
      '<h1>Welcome to the Codelab! Add your Firebase config object to <pre>/index.js</pre> and refresh to get started</h1>';
    throw new Error(
      'Welcome to the Codelab! Add your Firebase config object from the Firebase Console to `/index.js` and refresh to get started'
    );
  }

  // FirebaseUI config
  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      // Email / Password Provider.
      EmailAuthProvider.PROVIDER_ID
    ],
    callbacks: {
      signInSuccessWithAuthResult: function(authResult, redirectUrl) {
        // Handle sign-in.
        // Return false to avoid redirect.
        return false;
      }
    }
  };

  const ui = new firebaseui.auth.AuthUI(getAuth());

  // Listen to LOGIN button clicks
  startLoginButton.addEventListener('click', () => {
    if (auth.currentUser) {
      // User is signed in; allows user to sign out
      signOut(auth);
    } else {
      // No user is signed in; allows user to sign in
      ui.start('#firebaseui-auth-container', uiConfig);
    }
  });

 
  // Listen to the current Auth state
  onAuthStateChanged(auth, user => {
    if (user) {
      startLoginButton.textContent = 'LOGOUT';
      // Show guestbook to logged-in users
      guestbookContainer.style.display = 'block';
      descriptionContainer.style.display = 'none';
      subscribeGuestbook();
    } else {
      startLoginButton.textContent = 'LOGIN';
      // Hide guestbook for non-logged-in users
      guestbookContainer.style.display = 'none';
      descriptionContainer.style.display = 'block';
      unsubscribeGuestbook();
    }
  });
  
  // Listen to the form submission
  form.addEventListener('submit', async e => {
    // Prevent the default form redirect
    e.preventDefault();
    // Write a new message to the database collection "guestbook"
    addDoc(collection(db, 'guestbook'), {
      text: input.value,
      timestamp: Date.now(),
      name: auth.currentUser.displayName,
      userId: auth.currentUser.uid
    });
    // clear message input field
    input.value = '';
    // Return false to avoid redirect
    return false;
  });
}
main();

// Listen to guestbook updates
function subscribeGuestbook() {
  const q = query(collection(db, 'guestbook'), orderBy('timestamp', 'desc'));
  guestbookListener = onSnapshot(q, snaps => {
    // Reset page
    guestbook.innerHTML = '';
    // Loop through documents in database
    snaps.forEach(doc => {
      // Create an HTML entry for each document and add it to the chat
      const entry = document.createElement('p');
      entry.style = "overflow: auto;"
      if (doc.data().imageURL) {
        entry.innerHTML = '<img src="' + doc.data().imageURL + '">';
      } else {
        entry.textContent = doc.data().name + ': ' + doc.data().text;
      }
      guestbook.appendChild(entry);
    });
  });
}
//<p><img src="URL" alt="Image"></p>

 // Saves a new message containing an image in Firebase.
 // This first saves the image in Firebase storage.
 async function saveImageMessage(file) {
  try {
    // 1 - We add a message with a loading icon that will get updated with the shared image.
    const messageRef = await addDoc(collection(getFirestore(), 'guestbook'), {
      text: "LOADING_IMAGE_URL",
      timestamp: Date.now(),
      name: auth.currentUser.displayName,
      userId: auth.currentUser.uid,
      imageURL: LOADING_IMAGE_URL
    });

    // 2 - Upload the image to Cloud Storage.
    const filePath = `${getAuth().currentUser.uid}/${messageRef.id}/${file.name}`;
    const newImageRef = ref(getStorage(), filePath);
    const fileSnapshot = await uploadBytesResumable(newImageRef, file);
    
    // 3 - Generate a public URL for the file.
    const publicImageUrl = await getDownloadURL(newImageRef);

    // 4 - Update the chat message placeholder with the image’s URL.
    await updateDoc(messageRef,{
      text: "Image uploaded",
      imageURL: publicImageUrl,
      storageUri: fileSnapshot.metadata.fullPath
    });
  } catch (error) {
    console.error('There was an error uploading a file to Cloud Storage:', error);
  }
}


// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  // Return true if the user is signed in Firebase
  if (isUserSignedIn()) {
    return true;
  }

console.log("User not signed in :(");
  return false;
}

function isUserSignedIn() {
  return !!getAuth().currentUser;
}


 // Triggered when a file is selected via the media picker.
 function onMediaFileSelected(event) {
   console.log("UPLOADING IMAGE")
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  imageFormElement.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {
    saveImageMessage(file);
  }
}


// Unsubscribe from guestbook updates
function unsubscribeGuestbook() {
  if (guestbookListener != null) {
    guestbookListener();
    guestbookListener = null;
  }
}


// Events for image upload.
imageButtonElement.addEventListener('click', function(e) {
  e.preventDefault();
  mediaCaptureElement.click();
});
mediaCaptureElement.addEventListener('change', onMediaFileSelected);