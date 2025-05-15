document.getElementById('processButton').addEventListener('click', () => {
  const files = document.getElementById('fileInput').files;
  const mode = document.getElementById('modeSelect').value;
  const globalContactName = document.getElementById('globalNameInput').value.trim();
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';

  if (files.length === 0) {
    alert('Silakan unggah file terlebih dahulu.');
    return;
  }

  if (!globalContactName) {
    alert('Nama kontak global tidak boleh kosong.');
    return;
  }

  Array.from(files).forEach(file => {
    const listItem = document.createElement('div');
    listItem.classList.add('file-item');
    const fileName = file.name;
    const matches = fileName.match(/(.+)(\.[^.]+)$/);
    if (!matches) {
      listItem.classList.add('error');
      listItem.innerHTML = `<span>${fileName}</span><span class="error-msg">Nama file tidak valid.</span>`;
      fileList.appendChild(listItem);
      return;
    }
    const [_, namePart, extension] = matches;
    let newFileName = '';

    try {
      // Tentukan nama file baru sesuai mode
      if (mode === 'fileName') {
        newFileName = `${namePart}.vcf`;
      } else if (mode === 'inBrackets') {
        const matchBracket = namePart.match(/(.*?)/);
        if (matchBracket) {
          newFileName = `${matchBracket[1]}.vcf`;
        } else {
          throw new Error('Tidak ada tanda kurung dalam nama file.');
        }
      } else if (mode.startsWith('last')) {
        const charCount = parseInt(mode.replace('last', ''), 10);
        if (isNaN(charCount) || charCount <= 0) throw new Error('Jumlah karakter terakhir harus valid.');
        if (namePart.length >= charCount) {
          newFileName = `${namePart.slice(-charCount)}.vcf`;
        } else {
          throw new Error('Jumlah karakter melebihi panjang nama file.');
        }
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
    const lines = reader.result
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');

    // Filter hanya nomor yang valid (hanya digit)
    const contacts = lines.filter(line => /^\d+$/.test(line));

    const total = contacts.length;
    const digitCount = total >= 100 ? 3 : 2;

    let vcfContent = '';
    let currentCategory = 'Anggota';
    let localCounter = 1;

    for (const rawContact of lines) {
      // Cek kategori baru dari kata kunci
      const cat = classifyContact(rawContact);
      if (cat) {
        currentCategory = cat;
        localCounter = 1;
        continue; // kategori bukan kontak
      }

      // Jika kontak valid digit saja
      if (/^\d+$/.test(rawContact)) {
        // Pastikan nomor diawali '+'
        const contactNumber = rawContact.startsWith('+') ? rawContact : '+' + rawContact;

        // Format nomor urut dengan leading zero
        const numberStr = localCounter.toString().padStart(digitCount, '0');
        // Nama kontak dengan urutan nomor
        const contactName = `${globalContactName} ${numberStr}`;
        const fullContactName = currentCategory === 'Anggota' ? contactName : `${contactName} (${currentCategory})`;

        vcfContent +=
          `BEGIN:VCARD\nVERSION:3.0\nFN:${fullContactName}\nTEL:${contactNumber}\nEND:VCARD\n`;

        localCounter++;
      }
    }

    const blob = new Blob([vcfContent], { type: 'text/vcard' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = newFileName;
    link.textContent = `Unduh ${newFileName}`;
    link.classList.add('download-link');

    listItem.appendChild(link);
    listItem.classList.add('success');
  };
  reader.readAsText(file);
}

function classifyContact(contact) {
  if (contact.match(/管理号|管理|管理员|admin|Admin/)) return 'Admin';
  if (contact.match(/水軍|小号|水军|navy|Navy/)) return 'Navy';
  if (contact.match(/数据|客户|底料|进群资源|资料|Anggota/)) return 'Anggota';
  return null;
}
