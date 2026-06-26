// [यहाँ सबसे ऊपर आपकी अपनी Firebase config इम्पोर्ट लाइन्स रहेंगी, उन्हें न बदलें]
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize Firebase (अपनी क्रेडेंशियल्स का उपयोग करें)
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
const authSubmitBtn = document.getElementById('btn-auth-submit');
const authToggle = document.getElementById('auth-toggle');
const btnLogout = document.getElementById('btn-logout');

let isSignUpMode = false;
let currentUser = null;
let myChart = null;
let monthlyBudget = 0;
let currentExpensesTotal = 0;

// Auth Toggle (Login / Register Mode Swapping)
authToggle.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    authTitle.innerText = isSignUpMode ? "नया अकाउंट बनाएं" : "लॉगिन करें";
    authSubmitBtn.innerText = isSignUpMode ? "रजिस्टर करें" : "लॉगिन";
    authToggle.innerText = isSignUpMode ? "पहले से अकाउंट है? लॉगिन करें" : "नया अकाउंट बनाएं (Sign Up)";
});

// Authentication Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;

    try {
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("अकाउंट सफलतापूर्वक बन गया!");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        alert("त्रुटि: " + error.message);
    }
});

// Logout
btnLogout.addEventListener('click', () => signOut(auth));

// State Changed Handler
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authSection.style.display = 'none';
        mainApp.style.display = 'block';
        btnLogout.style.display = 'block';
        
        // डेटा लोड करना शुरू करें
        loadTransactions(user.uid);
        loadGoals(user.uid);
    } else {
        currentUser = null;
        authSection.style.display = 'block';
        mainApp.style.display = 'none';
        btnLogout.style.display = 'none';
    }
});

// --- Expense Tracker Logic ---
const moneyForm = document.getElementById('money-form');
moneyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const transaction = {
        userId: currentUser.uid,
        type: document.getElementById('type').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: new Date().toLocaleDateString('hi-IN')
    };

    await addDoc(collection(db, "transactions"), transaction);
    moneyForm.reset();
});

function loadTransactions(userId) {
    const q = query(collection(db, "transactions"), where("userId", "==", userId));
    onSnapshot(q, (snapshot) => {
        let income = 0;
        let expense = 0;
        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = '';

        let categoryData = {};

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.type === 'income') {
                income += data.amount;
            } else {
                expense += data.amount;
                categoryData[data.category] = (categoryData[data.category] || 0) + data.amount;
            }

            const li = document.createElement('li');
            li.innerHTML = `<span>${data.date} - ${data.category} (${data.type === 'income' ? 'आय' : 'खर्च'})</span> <strong>₹${data.amount}</strong>`;
            listEl.appendChild(li);
        });

        currentExpensesTotal = expense;
        document.getElementById('total-income').innerText = `₹${income}`;
        document.getElementById('total-expense').innerText = `₹${expense}`;
        document.getElementById('total-savings').innerText = `₹${income - expense}`;

        checkBudgetAlert();
        updateChart(categoryData);
    });
}

// --- 3. Budget Planner Logic ---
document.getElementById('btn-set-budget').addEventListener('click', () => {
    const bInput = document.getElementById('monthly-budget-input').value;
    if(bInput) {
        monthlyBudget = parseFloat(bInput);
        checkBudgetAlert();
    }
});

function checkBudgetAlert() {
    document.getElementById('budget-status-text').innerText = `बजट सीमा: ₹${monthlyBudget} | कुल खर्च: ₹${currentExpensesTotal}`;
    const alertBox = document.getElementById('budget-alert');
    if (monthlyBudget > 0 && currentExpensesTotal > monthlyBudget) {
        alertBox.style.display = 'block';
    } else {
        alertBox.style.display = 'none';
    }
}

// --- 4. Savings Goals Logic ---
const goalForm = document.getElementById('goal-form');
goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const goal = {
        userId: currentUser.uid,
        name: document.getElementById('goal-name').value,
        target: parseFloat(document.getElementById('goal-target').value),
        saved: 0
    };
    await addDoc(collection(db, "goals"), goal);
    goalForm.reset();
});

function loadGoals(userId) {
    const q = query(collection(db, "goals"), where("userId", "==", userId));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('goals-container');
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const g = doc.data();
            // सिमुलेशन के लिए कुल बचत का थोड़ा हिस्सा गोल में प्रोग्रेस बार दिखाने हेतु मानते हैं
            let progressPercent = Math.min((currentExpensesTotal * 0.1 / g.target) * 100, 100).toFixed(0); 
            
            const div = document.createElement('div');
            div.className = 'goal-item';
            div.innerHTML = `
                <strong>🎯 ${g.name}</strong> - लक्ष्य: ₹${g.target}
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <small>प्रगति: ${progressPercent}% पूरी हुई</small>
            `;
            container.appendChild(div);
        });
    });
}

// --- 7. Chart.js Graph Implementation ---
function updateChart(categoryData) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);

    if (myChart) { myChart.destroy(); }

    if(labels.length === 0) return;

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'खर्च विभाजन',
                data: data,
                backgroundColor: ['#c62828', '#ff9800', '#1565c0', '#7cb342', '#9c27b0', '#e91e63']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- 5 & 6. Quiz & Certificate Logic Window Scope Variables ---
const quizData = {
    1: { q: "50/30/20 नियम के अनुसार बचत में कितना प्रतिशत जाना चाहिए?", options: ["50%", "30%", "20%"], correct: 2 },
    2: { q: "दिखावे के लिए क्रेडिट कार्ड से लोन लेना कैसा कर्ज है?", options: ["अच्छा कर्ज", "खराब कर्ज (कर्ज का जाल)", "फायदेमंद"], correct: 1 }
};

window.openQuiz = function(lessonId) {
    const qObj = quizData[lessonId];
    document.getElementById('quiz-question').innerText = qObj.q;
    const optionsDiv = document.getElementById('quiz-options');
    optionsDiv.innerHTML = '';
    document.getElementById('quiz-result').innerText = '';

    qObj.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            if (idx === qObj.correct) {
                document.getElementById('quiz-result').innerText = "✅ सही जवाब! आपको सर्टिफिकेट अनलॉक हो गया है।";
                document.getElementById('quiz-result').style.color = "green";
                showCertificate();
            } else {
                document.getElementById('quiz-result').innerText = "❌ गलत जवाब, दोबारा कोशिश करें।";
                document.getElementById('quiz-result').style.color = "red";
            }
        };
        optionsDiv.appendChild(btn);
    });
    document.getElementById('quiz-modal').style.display = 'flex';
};

document.getElementById('btn-close-quiz').onclick = () => {
    document.getElementById('quiz-modal').style.display = 'none';
};

function showCertificate() {
    document.getElementById('certificate-box').style.display = 'block';
    document.getElementById('cert-user-name').innerText = currentUser.email.split('@')[0];
    document.getElementById('cert-date').innerText = new Date().toLocaleDateString('hi-IN');
}
