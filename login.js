import { getUserAccount } from "./dbService.js";
import { hashPassword } from "./utils.js";

document.addEventListener("DOMContentLoaded", function() {
    const loginForm =  document.getElementById('loginForm');
    const registerButton = document.getElementById('register');
    const errorMessage = document.getElementById('errorMessage');

    chrome.storage.local.get('isLoggedIn', function(result){
        if (result.isLoggedIn) {
                window.location.href = 'view-passwords.html';
        }
    });

    loginForm.addEventListener('submit',  function(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUser').value;
        const password = document.getElementById('loginPass').value;
    
        // Retrieve encrypted password from IndexedDB
        getUserAccount(username).then((userAccount) => {
            // alert(result);
            if (userAccount) {
                hashPassword(password).then((hashedPassword) => {
                    if (hashedPassword === userAccount.password) {
                        chrome.storage.local.set({isLoggedIn: true, username: username});
                        window.location.href = 'view-passwords.html';
                    } else {
                        errorMessage.textContent = "Invalid Credentials";
                    }
                }).catch((error) => {
                    alert(error);
                });
            } else {
                errorMessage.textContent = "User Not Found";
            }

        }).catch((error) => {
            errorMessage.textContent = error;
        })
    });

    registerButton.addEventListener('click', function(event) {
        event.preventDefault();
        window.location.href = 'create-account.html'
    });
});