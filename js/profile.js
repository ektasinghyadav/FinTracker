// Profile page: change name and email, change password, delete the account.

// Show the saved name and email in the form
function fillProfileForm() {
    document.getElementById('profileName').value  = currentUser.name;
    document.getElementById('profileEmail').value = currentUser.email;
}

// Save the new name and email (PUT /api/auth/profile)
async function saveProfile(e) {
    e.preventDefault();

    try {
        const user = await api(`${API_URL}/auth/profile`, {
            method: 'PUT',
            body: {
                name:  document.getElementById('profileName').value,
                email: document.getElementById('profileEmail').value
            }
        });

        currentUser = user;
        fillProfileForm();
        // keep the name in the header up to date (textContent keeps it plain text)
        document.getElementById('userName').textContent = currentUser.name;
        showToast('Profile updated!', 'success');

    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Change the password (PUT /api/auth/password)
async function changePassword(e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    if (newPassword !== document.getElementById('confirmPassword').value) {
        showToast('The new passwords do not match', 'warning');
        return;
    }

    try {
        await api(`${API_URL}/auth/password`, {
            method: 'PUT',
            body: {
                currentPassword: document.getElementById('currentPassword').value,
                newPassword
            }
        });

        document.getElementById('passwordForm').reset();
        showToast('Password changed!', 'success');

    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Delete the account and everything in it (DELETE /api/auth/account)
async function deleteAccount(e) {
    e.preventDefault();

    if (!confirm('Delete your account and ALL your data? This cannot be undone!')) {
        return;
    }

    try {
        await api(`${API_URL}/auth/account`, {
            method: 'DELETE',
            body: { password: document.getElementById('deletePassword').value }
        });

        // The account is gone, so go back to the login page
        window.location.replace('index.html');

    } catch (err) {
        showToast(err.message, 'error');
    }
}

function initProfile() {
    fillProfileForm();

    document.getElementById('profileForm').onsubmit  = saveProfile;
    document.getElementById('passwordForm').onsubmit = changePassword;
    document.getElementById('deleteForm').onsubmit   = deleteAccount;
}

startPage('profile', initProfile);
