import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// आपका असली Firebase कॉन्फ़िगरेशन
const firebaseConfig = {
    apiKey: "AIzaSyCxpzZYu-hroYzF0nimiUZZTtsxp-YNOWE",
    authDomain: "money-guru-d7661.firebaseapp.com",
    projectId: "money-guru-d7661",
    storageBucket: "money-guru-d7661.firebasestorage.app",
    messagingSenderId: "492010281342",
    appId: "1:492010281342:web:ebc1fa70ed2c9dd5323b2f"
};

// Firebase को इनिशियलाइज करें
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const authSection = document.getElementById('auth-section');
const mainApp = document.getElementById('main-app');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authTitle = document.getElementById('auth-title');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const authToggle = document.getElementById('auth-toggle');
const btnLogout = document.getElementById('btn-logout');

const moneyForm = document.getElementById('money-form');
const typeInput = document.getElementById('type');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const transactionList = document.getElementById('transaction-list');

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const totalSavingsEl = document.getElementById('total-savings');

let isSignUpMode = false;
let currentUser = null;

// --- Auth Toggle (लॉगिन <-> साइन अप स्विच) ---
authToggle.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        authTitle.innerText = "नया अकाउंट बनाएं";
        btnAuthSubmit.innerText = "रजिस्टर करें";
        authToggle.innerText = "पहले से अकाउंट है? लॉगिन करें";
    } else {
        authTitle.innerText = "लॉगिन करें";
        btnAuthSubmit.innerText = "लॉगिन";
        authToggle.innerText = "नया अकाउंट बनाएं (Sign Up)";
    }
});

// --- लॉगिन और रजिस्ट्रेशन हैंडलर ---
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;

    if (isSignUpMode) {
        createUserWithEmailAndPassword(auth, email, password)
            .then(() => alert("अकाउंट सफलतापूर्वक बन गया!"))
            .catch(err => alert("त्रुटि: " + err.message));
    } else {
        signInWithEmailAndPassword(auth, email, password)
            .catch(err => alert("लॉगिन फेल: " + err.message));
    }
});

// --- लॉगआउट हैंडलर ---
btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// --- Auth State Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authSection.style.display = 'none';
        mainApp.style.display = 'block';
        btnLogout.style.display = 'block';
        loadTransactions(user.uid);
    } else {
        currentUser = null;
        authSection.style.display = 'block';
        mainApp.style.display = 'none';
        btnLogout.style.display = 'none';
        transactionList.innerHTML = '';
    }
});

// --- डेटाबेस में सेव करें ---
moneyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const data = {
        userId: currentUser.uid,
        type: typeInput.value,
        amount: parseFloat(amountInput.value),
        category: categoryInput.value,
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "transactions"), data);
        moneyForm.reset();
    } catch (err) {
        alert("डेटा सेव नहीं हो पाया: " + err.message);
    }
});

// --- रियल-टाइम डेटा लोड करें ---
function loadTransactions(userId) {
    const q = query(collection(db, "transactions"), where("userId", "==", userId));
    
    onSnapshot(q, (snapshot) => {
        let income = 0;
        let expense = 0;
        transactionList.innerHTML = '';

        snapshot.forEach((doc) => {
            const t = doc.data();

            if (t.type === 'income') income += t.amount;
            else expense += t.amount;

            const li = document.createElement('li');
            li.className = t.type === 'income' ? 'li-income' : 'li-expense';
            li.innerHTML = `<span>${t.category}</span> <strong>${t.type === 'income' ? '+' : '-'} ₹${t.amount}</strong>`;
            transactionList.appendChild(li);
        });

        let savings = income - expense;
        totalIncomeEl.innerText = `₹${income}`;
        totalExpenseEl.innerText = `₹${expense}`;
        totalSavingsEl.innerText = `₹${savings}`;
        totalSavingsEl.style.color = savings < 0 ? '#c62828' : '#1565c0';
    });
}
