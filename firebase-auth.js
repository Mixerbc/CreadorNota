/**
 * Firebase Auth - Google login. SDK modular por CDN (v10).
 * Actualiza auth-area en el header y expone onAuthStateChanged para app.js.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDEGYiSgWWctOWVwhLnu8Tu7HES_CEfx7U',
  authDomain: 'notas-daf97.firebaseapp.com',
  projectId: 'notas-daf97',
  storageBucket: 'notas-daf97.firebasestorage.app',
  messagingSenderId: '703247552694',
  appId: '1:703247552694:web:790c158941a7f1f899d617',
  measurementId: 'G-JTFEHG8309'
};

// API para app.js (clave de storage por usuario y cerrar sesión desde menú)
window.firebaseAuth = {
  currentUser: null,
  _listeners: [],
  onAuthStateChanged(cb) {
    this._listeners.push(cb);
    if (this.currentUser !== undefined) cb(this.currentUser);
  },
  signOut: null
};

function showToast(message, type) {
  if (typeof window.showToast === 'function') window.showToast(message, type);
}

function doSignOut() {
  signOut(auth)
    .then(function () {
      showToast('Sesión cerrada', 'success');
    })
    .catch(function (err) {
      showToast('Error al cerrar sesión', 'error');
    });
}

function updateGlobalMenu(user) {
  var menu = document.getElementById('global-menu');
  if (!menu) return;
  var existing = menu.querySelector('[data-action="logout"]');
  if (existing) existing.remove();
  if (user) {
    var logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'dropdown-item';
    logoutBtn.setAttribute('data-action', 'logout');
    logoutBtn.textContent = 'Cerrar sesión';
    menu.appendChild(logoutBtn);
  }
}

function renderAuthUI(user) {
  var el = document.getElementById('auth-area');
  if (!el) return;
  el.innerHTML = '';
  updateGlobalMenu(user);
  if (user) {
    var wrap = document.createElement('div');
    wrap.className = 'auth-user-wrap';
    if (user.photoURL) {
      var img = document.createElement('img');
      img.className = 'auth-avatar';
      img.src = user.photoURL;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      wrap.appendChild(img);
    } else {
      var initial = document.createElement('span');
      initial.className = 'auth-avatar auth-avatar-initial';
      initial.textContent = (user.displayName || user.email || '?').charAt(0).toUpperCase();
      wrap.appendChild(initial);
    }
    var name = document.createElement('span');
    name.className = 'auth-user-name';
    name.textContent = user.displayName || user.email || 'Usuario';
    wrap.appendChild(name);
    el.appendChild(wrap);
  } else {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-auth-google';
    btn.title = 'Iniciar sesión con Google';
    btn.setAttribute('aria-label', 'Iniciar sesión con Google');
    var icon = document.createElement('span');
    icon.className = 'btn-auth-google-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<i class="fa-brands fa-google"></i>';
    var label = document.createElement('span');
    label.className = 'btn-auth-google-label';
    label.textContent = 'Iniciar sesión con Google';
    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener('click', function () {
      signInWithPopup(auth, new GoogleAuthProvider())
        .then(function () {
          showToast('Sesión iniciada', 'success');
        })
        .catch(function (err) {
          var msg = err.code === 'auth/popup-closed-by-user' ? 'Inicio de sesión cancelado' : 'Error al iniciar sesión';
          showToast(msg, 'error');
        });
    });
    el.appendChild(btn);
  }
}

var app = initializeApp(firebaseConfig);
var auth = getAuth(app);

window.firebaseAuth.signOut = doSignOut;

onAuthStateChanged(auth, function (user) {
  window.firebaseAuth.currentUser = user;
  renderAuthUI(user);
  window.firebaseAuth._listeners.forEach(function (cb) {
    cb(user);
  });
});
