/* Safety Matrix — statik tanımlar, proje bazlı seçim renderer.js'te */

const SAFETY_MATRIX_ORDER = ['I-1', 'I-2', 'I-3'];

const SAFETY_MATRIX_META = {
  tr: {
    sectionTitle: '2. Güvenlik ve Interlock Mantığı (Otomasyon Matrisi)',
    intro: 'Makine ve operatör güvenliği, tehlikeli hareketleri donanım ve yazılım olarak durduran Interlock algoritmaları ile sağlanır. Bunlar P&ID üzerinde Elmas (♦) sembolü ile gösterilir.',
    columns: {
      interlockId: 'Interlock ID',
      triggerSensor: 'Tetik Sensörü',
      lockedEquipment: 'Kilitlenen Ekipman',
      logic: 'Güvenlik Senaryosu ve Otomasyon Mantığı'
    },
    modalTitle: 'Safety Matrix',
    modalDesc: 'Bu projede yer alan interlock öğelerini seçin.',
    modalConfirm: 'Uygula',
    modalCancel: 'İptal',
    modalSaved: 'Safety Matrix güncellendi'
  },
  en: {
    sectionTitle: '2. Safety and Interlock Logic (Automation Matrix)',
    intro: 'The safety of the machine and the operator is ensured by Interlock algorithms that hardware-wise and software-wise halt dangerous movements. These are indicated by the Diamond (♦) symbol on the P&ID.',
    columns: {
      interlockId: 'Interlock ID',
      triggerSensor: 'Trigger Sensor',
      lockedEquipment: 'Locked Equipment',
      logic: 'Safety Scenario and Automation Logic'
    },
    modalTitle: 'Safety Matrix',
    modalDesc: 'Select the interlock items included in this project.',
    modalConfirm: 'Apply',
    modalCancel: 'Cancel',
    modalSaved: 'Safety Matrix updated'
  },
  de: {
    sectionTitle: '2. Sicherheits- und Verriegelungslogik (Automatisierungsmatrix)',
    intro: 'Die Sicherheit der Maschine und des Bedieners wird durch Interlock-Algorithmen gewährleistet, die gefährliche Bewegungen hardware- und softwareseitig stoppen. Diese sind auf dem P&ID durch das Diamant-Symbol (♦) gekennzeichnet.',
    columns: {
      interlockId: 'Interlock ID',
      triggerSensor: 'Auslösesensor',
      lockedEquipment: 'Gesperrte Anlage',
      logic: 'Sicherheitsszenario und Automatisierungslogik'
    },
    modalTitle: 'Safety Matrix',
    modalDesc: 'Wählen Sie die Interlock-Elemente für dieses Projekt.',
    modalConfirm: 'Anwenden',
    modalCancel: 'Abbrechen',
    modalSaved: 'Safety Matrix aktualisiert'
  }
};

const SAFETY_MATRIX_ROWS = {
  'I-1': {
    tr: {
      interlockId: 'I-1',
      triggerSensor: 'Hazne Kapı Şalteri (SW18)',
      lockedEquipment: 'Makine Çevrimi (GE01, PE02A/B)',
      logic: 'Personel Güvenliği: SW18 ile hazne kapağının güvenli şekilde kapalı olduğu doğrulanmadıkça makine çalışması engellenir. PLC, kapı açıkken ana sepet motorunun ve proses pompalarının çalışmasını önleyerek operatörü tehlikeli hareket ve sıvı temasından korur.'
    },
    en: {
      interlockId: 'I-1',
      triggerSensor: 'Chamber Door Switch (SW18)',
      lockedEquipment: 'Machine Cycle (GE01, PE02A/B)',
      logic: 'Personnel Safety: Machine operation is inhibited unless the chamber door is confirmed securely closed by SW18. The PLC prevents the main basket motor and process pumps from starting if the door is open, protecting the operator from hazardous motion and fluid exposure.'
    },
    de: {
      interlockId: 'I-1',
      triggerSensor: 'Kammertür-Schalter (SW18)',
      lockedEquipment: 'Maschinenzyklus (GE01, PE02A/B)',
      logic: 'Personalsicherheit: Der Maschinenbetrieb ist gesperrt, bis die Kammertür durch SW18 als sicher geschlossen bestätigt wurde. Die SPS verhindert den Start des Hauptkorbmotors und der Prozesspumpen bei geöffneter Tür und schützt den Bediener vor gefährlichen Bewegungen und Flüssigkeitskontakt.'
    }
  },
  'I-2': {
    tr: {
      interlockId: 'I-2',
      triggerSensor: 'Kapı Interlock Mantığı (IL)',
      lockedEquipment: 'Hazne Kapı Mekanizması',
      logic: 'Operasyonel Güvenlik (Opsiyonel): Donanımda mevcutsa, fiziksel interlock mekanizması aktif yıkama döngüsü başladığında hazne kapağını kilitler. Operatörün makine çalışırken kapağı yanlışlıkla açması engellenir; iç tehlikelere maruz kalma ve proses kesintileri azaltılır.'
    },
    en: {
      interlockId: 'I-2',
      triggerSensor: 'Door Interlock Logic (IL)',
      lockedEquipment: 'Chamber Door Mechanism',
      logic: 'Operational Safety (Optional Feature): When equipped, the physical interlock mechanism locks the chamber door as soon as the active wash cycle begins. This prevents the operator from accidentally opening the door while the machine is running, mitigating exposure to internal hazards and preventing process interruptions.'
    },
    de: {
      interlockId: 'I-2',
      triggerSensor: 'Tür-Verriegelungslogik (IL)',
      lockedEquipment: 'Kammertür-Mechanismus',
      logic: 'Betriebssicherheit (Optional): Bei Ausstattung verriegelt der physische Interlock-Mechanismus die Kammertür, sobald der aktive Waschzyklus beginnt. Dies verhindert, dass der Bediener die Tür während des Betriebs öffnet, und reduziert Gefährdungen sowie Prozessunterbrechungen.'
    }
  },
  'I-3': {
    tr: {
      interlockId: 'I-3',
      triggerSensor: 'Düşük Seviye Şalteri (LSL)',
      lockedEquipment: 'Elektrikli Isıtıcılar (R01, R02)',
      logic: 'Ekipman Koruması: Su seviyesi LSL eşiğinin altına düşerse ısıtıcılar elektriksel olarak interlock edilir. Bu, kuru çalışmayı önleyerek ısıtma elemanlarını ve tankı termal hasardan korur.'
    },
    en: {
      interlockId: 'I-3',
      triggerSensor: 'Level Switch Low (LSL)',
      lockedEquipment: 'Electric Heaters (R01, R02)',
      logic: 'Equipment Protection: If the water level drops below the LSL threshold, the heaters are electrically interlocked. This prevents "dry firing," protecting the heating elements and the tank from thermal damage.'
    },
    de: {
      interlockId: 'I-3',
      triggerSensor: 'Mindeststandwächter (LSL)',
      lockedEquipment: 'Elektroheizungen (R01, R02)',
      logic: 'Anlagenschutz: Fällt der Wasserstand unter den LSL-Schwellenwert, werden die Heizungen elektrisch verriegelt. Dies verhindert Trockenlauf und schützt Heizelemente und Tank vor thermischen Schäden.'
    }
  }
};

const SAFETY_MATRIX_COLS = [
  { key: 'interlockId', className: 'col-id', width: '13.75%' },
  { key: 'triggerSensor', className: 'col-trigger', width: '13.75%' },
  { key: 'lockedEquipment', className: 'col-locked', width: '13.75%' },
  { key: 'logic', className: 'col-logic', width: '58.75%' }
];

function getSafetyMatrixMeta(lang) {
  return SAFETY_MATRIX_META[lang] || SAFETY_MATRIX_META.en;
}

function getSafetyMatrixModalLabel(id, lang) {
  const row = SAFETY_MATRIX_ROWS[id];
  if (!row) return id;
  const loc = row[lang] || row.en;
  return loc.triggerSensor;
}

function buildSafetyMatrixTable(selectedIds, lang) {
  const meta = getSafetyMatrixMeta(lang);
  const table = document.createElement('table');
  table.className = 'doc-table safety-matrix-table';

  const colgroup = document.createElement('colgroup');
  for (const col of SAFETY_MATRIX_COLS) {
    const colEl = document.createElement('col');
    colEl.className = col.className;
    colEl.style.width = col.width;
    colgroup.appendChild(colEl);
  }
  table.appendChild(colgroup);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of SAFETY_MATRIX_COLS) {
    const th = document.createElement('th');
    th.className = col.className;
    th.textContent = meta.columns[col.key];
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const id of SAFETY_MATRIX_ORDER) {
    if (!selectedIds.includes(id)) continue;
    const rowData = SAFETY_MATRIX_ROWS[id]?.[lang] || SAFETY_MATRIX_ROWS[id]?.en;
    if (!rowData) continue;

    const tr = document.createElement('tr');
    for (const col of SAFETY_MATRIX_COLS) {
      const td = document.createElement('td');
      td.className = col.className;
      td.textContent = rowData[col.key];
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function buildSafetyMatrixSection(selectedIds, lang) {
  if (!selectedIds || !selectedIds.length) return [];

  const meta = getSafetyMatrixMeta(lang);
  const section = document.createElement('div');
  section.className = 'doc-block-stack safety-matrix-section';

  const heading = document.createElement('h2');
  heading.className = 'doc-h2';
  heading.textContent = meta.sectionTitle;
  section.appendChild(heading);

  const intro = document.createElement('p');
  intro.className = 'doc-p';
  intro.textContent = meta.intro;
  section.appendChild(intro);

  section.appendChild(buildSafetyMatrixTable(selectedIds, lang));
  return [section];
}
