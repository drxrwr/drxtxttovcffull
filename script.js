document.getElementById('processButton').addEventListener('click', () => {
    const files = document.getElementById('fileInput').files;
    const mode = document.getElementById('modeSelect').value;
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    if (files.length === 0) {
        alert('Silakan unggah file terlebih dahulu.');
        return;
    }

    // Ganti prompt jadi input kolom di HTML agar lebih bagus ya, ini contoh tetap pakai prompt
    const globalContactName = prompt('Masukkan nama kontak global untuk semua file:');
    if (!globalContactName) {
        alert('Nama kontak tidak boleh kosong.');
        return;
    }

    Array.from(files).forEach(file => {
        const listItem = document.createElement('div');
        listItem.classList.add('file-item');
        const fileName = file.name;
        const [namePart, extension] = fileName.match(/(.+)(\.[^.]+$)/).slice(1);
        let newFileName = '';

        try {
            if (mode === 'normal') {
                newFileName = `${namePart}.vcf`;
            } else if (mode === 'inBrackets') {
                const match = namePart.match(/(.*?)/);
                if (match) {
                    newFileName = `${match[1]}.vcf`;
                } else {
                    throw new Error('Tidak ada tanda kurung dalam nama file.');
                }
            } else if (mode.startsWith('last')) {
                const charCountStr = mode.replace('last', '');
                const charCount = parseInt(charCountStr, 10);

                if (isNaN(charCount) || charCount <= 0) {
                    throw new Error('Jumlah karakter terakhir harus berupa angka yang valid.');
                }

                if (namePart.length >= charCount) {
                    newFileName = `${namePart.slice(-charCount)}.vcf`;
                } else {
                    throw new Error('Jumlah karakter melebihi panjang nama file.');
                }
            } else if (mode === 'fileName') {
                newFileName = `${namePart}.vcf`;
            } else {
                throw new Error('Mode tidak dikenal. Harap pilih mode yang valid.');
            }

            generateDownloadLink(file, newFileName, globalContactName, listItem);
        } catch (error) {
            listItem.classList.add('error');
            listItem.innerHTML = `<span>${fileName}</span><span class="error-msg">${error.message}</span>`;
        }

        fileList.appendChild(listItem);
    });
});

function generateDownloadLink(file, newFileName, globalContactName, listItem) {
    const reader = new FileReader();
    reader.onload = () => {
        const txtContent = reader.result;
        const lines = txtContent.split('\n').filter(line => line.trim() !== '');

        let localCounter = 1;
        let currentCategory = 'Anggota';

        // Tentukan jumlah digit nomor untuk padding (2 digit untuk <100, 3 digit untuk >=100)
        const totalContacts = lines.filter(l => /^\d+$/.test(l.trim())).length;
        const digitLength = totalContacts >= 100 ? 3 : 2;

        const vcfContent = lines.map(line => {
            const contact = line.trim();
            const newCategory = classifyContact(contact);
            if (newCategory) {
                currentCategory = newCategory;
                localCounter = 1;
                return ''; // kategori bukan nomor, jadi skip
            }

            // Pastikan nomor hanya digit, kalau belum ada + di depan, tambahkan +
            let phoneNumber = contact;
            if (/^\d+$/.test(phoneNumber)) {
                phoneNumber = '+' + phoneNumber;
            }

            if (/^\+\d+$/.test(phoneNumber)) {
                const numberPadded = String(localCounter).padStart(digitLength, '0');
                const contactName = `${globalContactName} ${numberPadded}`;
                const fullContactName = currentCategory === 'Anggota' ? contactName : `${contactName} (${currentCategory})`;

                const contactVcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fullContactName}\nTEL:${phoneNumber}\nEND:VCARD\n`;
                localCounter++;
                return contactVcard;
            } else {
                return '';
            }
        }).join('\n');

        const blob = new Blob([vcfContent], { type: 'text/vcard' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = newFileName;
        link.textContent = `Unduh ${newFileName}`;
        link.classList.add('download-link');

        listItem.appendChild(link);
        listItem.classList.add('success');
        listItem.innerHTML += `<span> → Tautan tersedia untuk diunduh</span>`;
    };
    reader.readAsText(file);
}

function classifyContact(contact) {
    if (contact.match(/管理号|管理|管理员|admin|Admin/)) {
        return 'Admin';
    } else if (contact.match(/水軍|小号|水军|navy|Navy/)) {
        return 'Navy';
    } else if (contact.match(/数据|客户|底料|进群资源|资料|Anggota/)) {
        return 'Anggota';
    } else {
        return null;
    }
}
