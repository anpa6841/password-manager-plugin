import { decryptSitePassword, showHidePassword, toggleVisibility } from "./utils.js";
import { openIndexedDB, getPassword, addPassword, updatePassword, deletePassword, getAllPasswords } from "./dbService.js";

document.addEventListener("DOMContentLoaded", function() {
    const addPasswordButton = document.getElementById("addPassword");
    const addPasswordForm = document.getElementById("addPasswordForm");
    const addShowPasswordButton = addPasswordForm.querySelector("#showPassword");
    const addCloseButton = addPasswordForm.querySelector("#closeButton");
    const passwordList = document.getElementById("password-list");

    // Add Password form text fields
    const siteUsernameField = document.getElementById("siteUsername");
    const passwordField = document.getElementById("password");
    const websiteField = document.getElementById("website");

    let username;

    chrome.storage.local.get('isLoggedIn', function(result){
        if (!result.isLoggedIn) {
                window.location.href = 'login.html';
        } else {
            chrome.storage.local.get('username', function(result){
                if (result.username) {
                    // display all passwords on page load
                    username = result.username;
                    displayPasswords(username);
                }
            });
        }
    });

    // open addPasswordForm on add button click
    addPasswordButton.addEventListener('click', function(event) {
        event.preventDefault();
        toggleVisibility(addPasswordForm);
    });

    // close addPasswordForm on add button click
    addCloseButton.addEventListener('click', function(event) {
        event.preventDefault();
        toggleVisibility(addPasswordForm);
    });

    addShowPasswordButton.addEventListener('click', function(event) {
        event.preventDefault();
        const addPassword = addPasswordForm.querySelector('#password');
        showHidePassword(addShowPasswordButton, addPassword);
    });

    // save password to indexDB
    addPasswordForm.addEventListener('submit', function(event) {
        event.preventDefault();
        let siteUsername = siteUsernameField.value;
        let password = passwordField.value;
        let website = websiteField.value;
    
        addPassword(username, siteUsername, password, website).then((event) => {
            var passwordId = event.target.result;
            var listItem = createListItem({
                "id": passwordId,
                "username": username,
                "siteUsername": siteUsername,
                "password": password,
                "website": website
            });
            passwordList.appendChild(listItem);
            siteUsernameField.value = "";
            passwordField.value = "";
            websiteField.value = "";

        }).catch((error) => {
            console.error(error);
        })
    });

    function displayPasswords(username) {
        return new Promise((resolve, reject) => {
            openIndexedDB().then((db) => {
                getAllPasswords(username).then((passwords) => {
                    for (let i = 0; i < passwords.length; i++) {
                        var listItem = createListItem(passwords[i]);
                        // console.log(listItem);
                        passwordList.appendChild(listItem);
                    }
                });
            }).catch((error) => {
                reject(error);
            });
        });
    }

    function createListItem(password) {
        const listItem = document.createElement('li');
        const listItemId = password.id;
        listItem.setAttribute('id', listItemId);

        var link = document.createElement('a');
        link.href = password.website;
        link.textContent = password.website;

        const autoFillButton = document.createElement('button');
        autoFillButton.textContent = 'AutoFill';
        autoFillButton.setAttribute('id', password.id);

        const editPasswordButton = document.createElement('button');
        editPasswordButton.textContent = 'Edit';

        const deletePasswordButton = document.createElement('button');
        deletePasswordButton.textContent = 'Delete';

        listItem.append(link);
        listItem.appendChild(deletePasswordButton);
        listItem.appendChild(editPasswordButton);
        // listItem.appendChild(autoFillButton);

        editPasswordButton.onclick = function() {
            // disable edit button
            editPasswordButton.disabled = true;

            var editForm = addPasswordForm.cloneNode(true);

            const editShowPasswordButton = editForm.querySelector('#showPassword');
            const editCloseButton = editForm.querySelector("#closeButton");
            const editPassword = editForm.querySelector('#password');

            // Explicitly hide password field everytime a new form is created via clone on edit button click
            editPassword.type = "password"
            editShowPasswordButton.textContent = "Show"

            fillEditForm(editForm, password);
            listItem.appendChild(editForm);

            editForm.addEventListener('submit', function(event) {
                event.preventDefault();
                editPasswordDetails(editForm);
            });

            // close editPasswordForm
            editCloseButton.addEventListener('click', function(event) {
                event.preventDefault();
                toggleVisibility(editForm);
                editPasswordButton.disabled = false;
            });

            editShowPasswordButton.onclick = function(event) {
                event.preventDefault();
                const editPassword = editForm.querySelector('#password');
                showHidePassword(editShowPasswordButton, editPassword);
            }
        }

        deletePasswordButton.onclick = function() {
            deletePassword(password.id).then(() => {
                var listItem = document.getElementById(password.id);
                // console.log(listItem);
                passwordList.removeChild(listItem);
            });
        }

        // autoFillButton.onclick = function() {
        //     autoFill(autoFillButton);
        // };
        return listItem;
    }

    function fillEditForm(editForm, password) {
        editForm.style.display = 'block';
        editForm.setAttribute('username', password.username);
        editForm.setAttribute('id', password.id);

        const editSiteUsername = editForm.querySelector('#siteUsername');
        const editPassword = editForm.querySelector('#password');
        const editWebsite = editForm.querySelector('#website');

        editPassword.value = password.password;
        editSiteUsername.value = password.siteUsername;
        editWebsite.value = password.website;

        decryptSitePassword(password.username, password.password).then((decryptedPassword) => {
            editPassword.value = decryptedPassword;
        });
    }

    function editPasswordDetails(editForm) {
        const id = editForm.getAttribute('id');
        const username = editForm.getAttribute('username');
        const siteUsername = editForm.querySelector('#siteUsername').value;
        const password = editForm.querySelector('#password').value;
        const website = editForm.querySelector('#website').value;
        updatePassword(id, username, siteUsername, password, website).then(function() {
            location.reload();
        });
    }

    function autoFill(autoFillButton) {
        const passwordId = autoFillButton.getAttribute('id');

        getPassword(parseInt(passwordId)).then((password) => {
            decryptSitePassword(password.username, password.password).then((decryptedPassword) => {
                sendMessageToContentScript(password.siteUsername, decryptedPassword);
            });
        });
    }

    // Function to send a message to the content script with arguments
    function sendMessageToContentScript(username, password) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            var activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, { action: 'autofill', username: username, password: password, title: activeTab.title});
        });
    }
});
