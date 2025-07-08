// Firebase SDK imports
// Updated SDK version to 11.10.0 as per your provided config
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Get references to DOM elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const worksheetInput = document.getElementById('worksheet');
const entryListDiv = document.getElementById('entryList');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const noDataMessage = document.getElementById('noDataMessage');
const messageBox = document.getElementById('messageBox');
const userIdDisplay = document.getElementById('userIdDisplay');

// ====================================================================================
// YOUR FIREBASE PROJECT CONFIGURATION - THIS HAS BEEN UPDATED WITH YOUR VALUES!
// ====================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBbgq20FpxjSW_eXX29AGImcMhme-8869E",
    authDomain: "worksheet-af4e5.firebaseapp.com",
    projectId: "worksheet-af4e5",
    storageBucket: "worksheet-af4e5.firebasestorage.app",
    messagingSenderId: "343043134646",
    appId: "1:343043134646:web:ff4bc8033359349d568217",
    measurementId: "G-NTMBDJTDSC" // measurementId is included but not used by this app's logic
};

// Use the appId from your firebaseConfig
const appId = firebaseConfig.appId;
// initialAuthToken is typically for Canvas environment, not needed for public GitHub Pages anonymous sign-in
const initialAuthToken = null;
// ====================================================================================


let db;
let auth;
let currentUserId = 'Loading...'; // Default state before auth

// Function to show a custom message box
function showMessageBox(message, type = 'success') {
    messageBox.textContent = message;
    messageBox.className = `message-box show ${type}`;
    setTimeout(() => {
                messageBox.classList.remove('show');
            }, 3000);
        }

        // Helper function to format a Date object into a readable date string (YYYY-MM-DD)
        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Helper function to format a Date object into a readable time string (HH:MM:SS)
        function formatTime(date) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }

        // Function to render the list of all entries in the UI
        function renderEntries(entries) {
            entryListDiv.innerHTML = ''; // Clear existing list

            if (entries.length === 0) {
                noDataMessage.style.display = 'block';
                noDataMessage.textContent = 'No entries collected yet.';
                entryListDiv.appendChild(noDataMessage);
            } else {
                noDataMessage.style.display = 'none';
                const ul = document.createElement('ul');
                ul.className = 'list-disc list-inside space-y-2';
                // Sort entries by timestamp to ensure consistent display
                entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                entries.forEach(entry => {
                    const li = document.createElement('li');
                    li.className = 'text-gray-700 text-lg';
                    li.textContent = `Username: ${entry.username}, Date: ${entry.date}, Work: ${entry.worksheet}, Entry Time: ${entry.entryTime}`;
                    ul.appendChild(li);
                });
                entryListDiv.appendChild(ul);
            }
        }

        // Initialize Firebase and set up authentication
        async function initializeFirebase() {
            try {
                console.log("Initializing Firebase app with config:", firebaseConfig); // Log config
                const app = initializeApp(firebaseConfig);
                console.log("Firebase app initialized successfully.");

                db = getFirestore(app);
                auth = getAuth(app);

                // Listen for auth state changes
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        currentUserId = user.uid;
                        userIdDisplay.textContent = currentUserId;
                        console.log("Authenticated with user ID:", currentUserId);
                        // Start listening for Firestore data once authenticated
                        listenForFirestoreData();
                    } else {
                        // Sign in anonymously if no user is logged in
                        console.log("Attempting anonymous sign-in...");
                        await signInAnonymously(auth);
                        console.log("Anonymous sign-in attempt complete.");
                    }
                });
            } catch (error) {
                console.error("Error initializing Firebase or signing in:", error);
                showMessageBox("Failed to initialize app or authenticate. Check console for details.", "error");
            }
        }

        // Listen for real-time updates from Firestore
        function listenForFirestoreData() {
            // Collection path for public data
            // This path should match your Firestore security rules.
            const userActivitiesCollection = collection(db, `artifacts/${appId}/public/data/user_activities`);
            const q = query(userActivitiesCollection);

            onSnapshot(q, (snapshot) => {
                const entries = [];
                snapshot.forEach((doc) => {
                    entries.push(doc.data());
                });
                renderEntries(entries); // Render the fetched data
                console.log("Firestore data updated:", entries);
            }, (error) => {
                console.error("Error listening to Firestore data:", error);
                showMessageBox("Failed to load data. Please try again later.", "error");
            });
        }

        // Event listener for form submission
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            const username = usernameInput.value.trim();
            const worksheet = worksheetInput.value.trim();

            if (!db || !auth.currentUser) {
                showMessageBox('App not ready. Please wait for authentication.', 'error');
                console.error("Firestore DB or user not ready.");
                return;
            }

            if (username && worksheet) { // Username and Worksheet are required
                const now = new Date();
                const entryDate = formatDate(now);
                const entryTime = formatTime(now);

                try {
                    // Add document to Firestore
                    await addDoc(collection(db, `artifacts/${appId}/public/data/user_activities`), {
                        username: username,
                        date: entryDate,
                        worksheet: worksheet,
                        entryTime: entryTime,
                        userId: currentUserId, // Store the user ID who submitted the entry
                        timestamp: now.toISOString() // Store ISO string for better sorting/filtering if needed
                    });
                    showMessageBox('Entry submitted and saved!', 'success');
                    // Clear input fields
                    usernameInput.value = '';
                    worksheetInput.value = '';
                } catch (e) {
                    console.error("Error adding document: ", e);
                    showMessageBox('Error saving entry. Please try again.', 'error');
                }
            } else {
                showMessageBox('Please enter both Username and Work Sheet.', 'error');
            }
        });

        // Event listener for CSV download button
        downloadCsvBtn.addEventListener('click', async () => {
            if (!db || !auth.currentUser) {
                showMessageBox('App not ready. Please wait for authentication.', 'error');
                console.error("Firestore DB or user not ready for download.");
                return;
            }

            try {
                const querySnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/user_activities`));
                const entries = [];
                querySnapshot.forEach((doc) => {
                    entries.push(doc.data());
                });

                if (entries.length === 0) {
                    showMessageBox('No data to download!', 'error');
                    return;
                }

                // Sort entries by timestamp before creating CSV
                entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                // Create CSV content with headers in the specified order
                let csvContent = "Username,Date,Work,Entry Time,Submitted By User ID\n"; // Added User ID column
                entries.forEach(entry => {
                    // Escape double quotes in data and enclose fields in quotes
                    const sanitizedUsername = `"${entry.username.replace(/"/g, '""')}"`;
                    const sanitizedDate = `"${entry.date.replace(/"/g, '""')}"`;
                    const sanitizedWorksheet = `"${entry.worksheet.replace(/"/g, '""')}"`;
                    const sanitizedEntryTime = `"${entry.entryTime.replace(/"/g, '""')}"`;
                    const sanitizedUserId = `"${entry.userId.replace(/"/g, '""')}"`; // Include user ID

                    csvContent += `${sanitizedUsername},${sanitizedDate},${sanitizedWorksheet},${sanitizedEntryTime},${sanitizedUserId}\n`;
                });

                // Create a Blob from the CSV content
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

                // Create a temporary URL for the Blob
                const url = URL.createObjectURL(blob);

                // Create a temporary anchor element and trigger a download
                const a = document.createElement('a');
                a.href = url;
                a.download = `Dailywork_All_Entries.csv`; // Single file name for all data
                document.body.appendChild(a); // Append to body (required for Firefox)
                a.click(); // Programmatically click the link to trigger download
                document.body.removeChild(a); // Clean up
                URL.revokeObjectURL(url); // Release the object URL

                showMessageBox(`All data downloaded as Dailywork_All_Entries.csv!`, 'success');
            } catch (error) {
                console.error("Error fetching data for download:", error);
                showMessageBox("Failed to fetch data for download. Please try again.", "error");
            }
        });

        // Initialize Firebase when the page loads
        document.addEventListener('DOMContentLoaded', initializeFirebase);
