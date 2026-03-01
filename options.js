// Saves options to chrome.storage
const saveOptions = () => {
    const email = document.getElementById('export-email').value;
    const publicKey = document.getElementById('emailjs-public-key').value;
    const serviceId = document.getElementById('emailjs-service-id').value;
    const templateId = document.getElementById('emailjs-template-id').value;

    chrome.storage.local.set(
        {
            defaultExportEmail: email,
            emailjsPublicKey: publicKey,
            emailjsServiceId: serviceId,
            emailjsTemplateId: templateId
        },
        () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('save-status');
            status.classList.remove('hidden');
            setTimeout(() => {
                status.classList.add('hidden');
            }, 2000);
        }
    );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    chrome.storage.local.get(
        {
            defaultExportEmail: '',
            emailjsPublicKey: '',
            emailjsServiceId: '',
            emailjsTemplateId: ''
        }, // default values if none saved
        (items) => {
            document.getElementById('export-email').value = items.defaultExportEmail;
            document.getElementById('emailjs-public-key').value = items.emailjsPublicKey;
            document.getElementById('emailjs-service-id').value = items.emailjsServiceId;
            document.getElementById('emailjs-template-id').value = items.emailjsTemplateId;
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save-btn').addEventListener('click', saveOptions);
