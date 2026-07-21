# Rencana & Rekap Pembangunan Bank Soal Fallback

> File ini adalah **sumber kebenaran tunggal (single source of truth)** untuk pekerjaan
> pembangunan bank soal fallback di `src/server/fallback`.
> Tujuan: memastikan soal selalu tampil walau `AI_GENERATE=false` atau saat AI gagal,
> dengan variasi acak yang besar agar terasa fresh.
> Proses dilakukan **bertahap per bagian** agar bisa direview per bagian.

---

## 0. Glossary & Konvensi

| Istilah | Arti |
|---|---|
| Bank entry | Satu objek JSON di array sebuah file bank; satu "unit" soal (satu passage, satu audio script, satu set 10 Q) |
| Unit | Satu bank entry yang sudah di-shuffle / direnumber oleh loader dan siap ditampilkan |
| Difficulty | `EASY` \| `MEDIUM` \| `HARD` |
| Renumber | Memastikan `questionNumber` berurutan dari `startIndex` |
| Shuffle MCQ options | Mengacak posisi 4 opsi sambil menjaga `correctAnswer` tetap menunjuk jawaban benar |

**Konvensi penamaan file (TARGET):**
```
src/server/fallback/<EXAM>/<SECTION>/<topic-or-index>/bank.json
```
Setiap `bank.json` berisi **array** dari bank entry. Satu bank entry = satu unit lengkap
(passage + questions, atau audioScript + questions, dsb.).

**Konvensi difficulty:** setiap bank entry WAJIB punya field `difficulty` (`EASY`/`MEDIUM`/`HARD`).
Loader `filterByDifficulty` sudah menangani fallback ke seluruh bank bila level tidak ada,
namun idealnya tiap bank punya ketiganya.

---

## 1. Status Quo (Hasil Audit)

### 1.1 Arsitektur yang sudah ada
- `src/server/http/questions.ts` → dispatcher: bila `AI_GENERATE=false` (via `isFallbackMode()`),
  panggil `loadXxx` dari `loader.ts`; selain itu panggil `xxxEngine.generateXxx` (AI).
- `src/server/fallback/loader.ts` → import statis JSON, shuffle questions, shuffle MCQ options,
  renumber, `filterByDifficulty`, `pickRandom`, validasi via Zod schema.
- `src/server/schemas/{ielts,toefl}.ts` → Zod schemas yang WAJIB dipenuhi setiap bank entry.
- `src/server/engines/{ielts,toefl}.ts` → versi AI (acuan format prompt & struktur).

### 1.2 Endpoint yang ada (dari `questions.ts`)
| Endpoint | Fallback saat ini | Catatan |
|---|---|---|
| `/toefl/listening/part-a` | iya | |
| `/toefl/listening/part-b` | iya | |
| `/toefl/listening/part-c` | iya | |
| `/toefl/listening/part-d` | iya | |
| `/toefl/listening/part-e` | iya | |
| `/toefl/reading` | iya | gabungan passage 1+2+3 |
| `/toefl/reading/passage` | iya | per passage |
| `/toefl/structure` | iya | |
| `/ielts/listening` | iya | section 1-5 |
| `/ielts/reading` | iya | gabungan passage 1+2+3 |
| `/ielts/reading/passage` | iya | per passage |
| `/ielts/writing/task-1` | **TIDAK** | AI only |
| `/ielts/writing/task-2` | **TIDAK** | AI only |
| `/ielts/complete-listening` | iya | gabungan section 1-5 |
| `/ielts/complete-writing` | **TIDAK** | AI only |

### 1.3 KRITIS: Inkonsistensi path loader vs disk (BUG saat ini)
`loader.ts` mengimpor file di root `fallback/toefl/*.json` & `fallback/ielts/*.json`, **TETAPI**
file di disk sudah dipindah ke subdirektori (`fallback/toefl/listening/part-a/bank.json`, dst.).
Akibatnya: **build/runtime akan gagal** saat import statis.

| Import di loader.ts (SAAT INI - SALAH) | Yang ada di disk |
|---|---|
| `./toefl/listening-part-a.json` | `./toefl/listening/part-a/bank.json` |
| `./toefl/listening-part-b.json` | `./toefl/listening/part-b/bank.json` |
| `./toefl/listening-part-c.json` | `./toefl/listening/part-c/bank.json` |
| `./toefl/listening-part-d.json` | `./toefl/listening/part-d/bank.json` |
| `./toefl/listening-part-e.json` | `./toefl/listening/part-e/bank.json` |
| `./toefl/reading-passage-1.json` | `./toefl/reading/passage-1.json` |
| `./toefl/reading-passage-2.json` | `./toefl/reading/passage-2.json` |
| `./toefl/reading-passage-3.json` | `./toefl/reading/passage-3.json` |
| `./toefl/structure.json` | **TIDAK ADA** |
| `./ielts/listening-section-1.json` | `./ielts/listening/section-1.json` |
| `./ielts/listening-section-2.json` | `./ielts/listening/section-2.json` |
| `./ielts/listening-section-3.json` | `./ielts/listening/section-3.json` |
| `./ielts/listening-section-4.json` | `./ielts/listening/section-4.json` |
| `./ielts/listening-section-5.json` | `./ielts/listening/section-5.json` |
| `./ielts/reading-passage-1.json` | **TIDAK ADA** (folder `ielts/reading` kosong) |
| `./ielts/reading-passage-2.json` | **TIDAK ADA** |
| `./ielts/reading-passage-3.json` | **TIDAK ADA** |

**Tindakan wajib (fase 0):** perbaiki path import di `loader.ts` agar cocok dengan disk,
dan buat file yang hilang. Ini harus didahului agar sistem build.

### 1.4 Jumlah entry per bank saat ini (perlu diperbanyak)
| Bank | Entry | Target min (lihat §3) |
|---|---|---|
| `toefl/listening/part-a/bank.json` | ~? (file 93KB) | 30 |
| `toefl/listening/part-b/bank.json` | ? (30KB) | 30 |
| `toefl/listening/part-c/bank.json` | ? (35KB) | 30 |
| `toefl/listening/part-d/bank.json` | ? (34KB) | 30 |
| `toefl/listening/part-e/bank.json` | ? (37KB) | 30 |
| `toefl/reading/passage-{1,2,3}.json` | 1 file = 1 passage unit (416 baris) | 10 per index |
| `toefl/structure` | **0** | 1 bank besar 40+ Q |
| `ielts/listening/section-{1..5}.json` | 2 entry per file (EASY+MEDIUM) | 30 per section |
| `ielts/reading/passage-{1,2,3}` | **0** | 10 per index |
| `ielts/writing/task-1` | **0** | 10 |
| `ielts/writing/task-2` | **0** | 10 |

---

## 2. Spesifikasi Struktur Bank (Per Tipe)

> Semua tipe sudah punya Zod schema di `src/server/schemas/*.ts`.
> Bank entry **WAJIB** lolos `XxxSchema.parse()` setelah loader menambahkan default `points`/`estimatedTime`.
> Field yang ditandai `[DIPASANG OLEH LOADER]` tidak perlu ditulis manual di bank.

### 2.1 IELTS Listening (per section 1-5)
Schema: `IELTSListeningSectionSchema`
```jsonc
{
  "type": "LISTENING",
  "section": "SECTION_1",                 // SECTION_1..SECTION_5
  "questionText": "...",                  // min 10 char
  "audioScript": "...",                   // min 100 char; mulai dgn "Situation: ..."
  "context": {
    "setting": "SOCIAL_SURVIVAL",         // lihat enum per section
    "speakers": [
      { "name": "...", "accent": "BRITISH", "gender": "FEMALE", "role": "..." }
      // accent: BRITISH|AMERICAN|AUSTRALIAN|CANADIAN
    ]                                     // 1-4 speakers
  },
  "questions": [ /* TEPAT 10 */ {
    "questionNumber": 1,                  // 1..10
    "questionType": "MULTIPLE_CHOICE",    // bisa dicampur dgn FORM_COMPLETION dll, tapi loader sekarang hanya MCQ-shuffle
    "questionText": "...",
    "answerFormat": "LETTER",             // SINGLE_WORD|NUMBERS|MULTIPLE_WORDS|LETTER
    "correctAnswer": 0,                   // 0..3 (indeks); untuk non-MCQ bisa string/array
    "options": ["A","B","C","D"],         // 4 opsi
    "keywords": ["..."],
    "synonymsUsed": ["..."]
  }],
  "keyVocabulary": [ /* min 5 */ { "word": "...", "pronunciationNote": "/.../", "meaning": "..." } ],
  "difficulty": "EASY"                    // EASY|MEDIUM|HARD
}
```
Setting wajib per section (dari engine): S1=`SOCIAL_SURVIVAL`, S2=`EDUCATIONAL_SURVIVAL`,
S3=`ACADEMIC_DISCUSSION`, S4=`ACADEMIC_LECTURE`, S5=`ACADEMIC_LECTURE_ADVANCED`.

### 2.2 IELTS Reading Passage Unit
Schema: `IELTSReadingPassageOnlySchema` (passage saja) + questions batch.
File bank = array berisi:
```jsonc
{
  "passage": {
    "title": "...",                       // min 10
    "subtitle": "...",                    // optional
    "source": "...", "author": "...", "date": "...",  // optional
    "wordCount": 650,                     // 500-850
    "content": "...",                     // min 500 char; idealnya 5 paragraf
    "topicCategory": "SCIENCE_TECHNOLOGY",// enum
    "textType": "DESCRIPTIVE",            // DESCRIPTIVE|DISCURSIVE|NARRATIVE|ARGUMENTATIVE
    "hasDiagram": false, "hasChart": false,
    "questionStart": 1, "questionEnd": 15 // optional
  },
  "questions": [ /* lihat IELTSReadingQuestionItemSchema */ {
    "questionNumber": 1,
    "questionType": "MULTIPLE_CHOICE",    // 14 enum (campur untuk variasi)
    "questionText": "...",
    "paragraphReference": 1,              // optional
    "options": ["...","...","...","..."],
    "correctAnswer": 0,                   // 0..3
    "wordLimit": 1,                       // optional utk completion
    "explanation": "...",                 // min 20
    "keywordsInPassage": ["..."],
    "paraphrasing": "..."                 // min 8
  }],
  "difficulty": "MEDIUM",
  "type": "READING_PASSAGE"               // discriminator
}
```
Distribusi questions (dari engine): passage1=Q1-15, passage2=Q16-30, passage3=Q31-40.
Variansi tipe soal dianjurkan: MULTIPLE_CHOICE, TRUE_FALSE_NOT_GIVEN, MATCHING_HEADINGS,
SENTENCE_COMPLETION, SUMMARY_COMPLETION, SHORT_ANSWER, dll.

### 2.3 IELTS Writing Task 1
Schema: `IELTSWritingTask1Schema` (BELUM ada loader). Bank perlu:
```jsonc
{
  "type": "WRITING_TASK_1",
  "taskType": "LINE_GRAPH",               // LINE_GRAPH|BAR_CHART|PIE_CHART|TABLE|DIAGRAM|MAP|PROCESS
  "visualData": {
    "chartType": "line",                  // line|bar|pie|table|process
    "title": "...",
    "xAxisLabel": "...", "yAxisLabel": "...",
    "categories": ["2010","2015","2020"],
    "series": [ { "name": "...", "data": [10,20,30] } ], // panjang data == categories.length
    "units": "...",
    "keyFeatures": ["...","...","..."]    // min 3
  },
  "instructions": "...",                  // min 50
  "rubricFocus": ["TASK_ACHIEVEMENT","COHERENCE_COHESION","LEXICAL_RESOURCE","GRAMMATICAL_RANGE"],
  "suggestedApproach": {
    "introduction": "...", "overview": "...",
    "bodyParagraphs": ["...","..."],
    "keyLanguage": ["...","...","...","...","..."]
  },
  "sampleAnswer": {
    "bandScore": 8, "wordCount": 175, "content": "...", "examinerComments": "..."
  },
  "timeLimit": 20, "wordRequirement": 150,
  "difficulty": "EASY"
}
```

### 2.4 IELTS Writing Task 2
Schema: `IELTSWritingTask2Schema`. Bank perlu:
```jsonc
{
  "type": "WRITING_TASK_2",
  "essayType": "OPINION",                 // OPINION|DISCUSSION|PROBLEM_SOLUTION|ADVANTAGES_DISADVANTAGES|DIRECT_QUESTION
  "prompt": { "statement": "...", "question": "...", "context": "..." },
  "topicCategory": "EDUCATION",
  "instructions": "...",
  "rubricFocus": ["TASK_RESPONSE","COHERENCE_COHESION","LEXICAL_RESOURCE","GRAMMATICAL_RANGE"],
  "suggestedStructure": {
    "introduction": { "approach": "...", "shouldAddress": ["..."] },
    "bodyParagraphs": [ { "purpose":"...", "suggestedContent":"...", "exampleType":"PERSONAL" } ], // 2-3
    "conclusion": { "approach": "...", "shouldAvoid": ["..."] }
  },
  "keyVocabulary": [ /* min 10 */ { "word":"...", "usage":"...", "formality":"FORMAL" } ],
  "sampleAnswer": {
    "bandScore": 8, "wordCount": 280, "content": "...",
    "examinerComments": "...", "strengths": ["...","..."],
    "areasForImprovement": ["..."]
  },
  "commonMistakes": [ /* min 3 */ { "mistake":"...", "correction":"...", "whyItMatters":"..." } ],
  "timeLimit": 40, "wordRequirement": 250,
  "difficulty": "EASY"
}
```

### 2.5 TOEFL Listening Part A-E
Schema: `TOEFLListeningPartA..ESchema`. Semua punya bentuk sama, bedanya:
- Part A: audioScript min 200, 2 speakers, keyVocab min 3
- Part B: min 260, 2-3 speakers, keyVocab min 5
- Part C: min 500, 2-4 speakers, keyVocab min 6
- Part D: min 350, 2-4 speakers, keyVocab min 6
- Part E: min 600, 1-2 speakers, keyVocab min 8, **WAJIB** `academicField` + `lectureTopic`

```jsonc
{
  "type": "LISTENING_PART_A",             // _A.._E
  "questionText": "...",                  // min 10
  "audioScript": "...",                   // min sesuai part; mulai "Situation: ..."
  "speakers": [ { "name":"...", "role":"..." } ],
  "setting": "CAFETERIA",                 // CAFETERIA|STUDENT_CENTER|CAMPUS|ACADEMIC_OFFICE|LIBRARY
  "academicField": "BIOLOGY",             // Part E only
  "lectureTopic": "...",                  // min 20 char (Part E only)
  "questions": [ /* TEPAT 10 */ {
    "questionNumber": 1,
    "questionText": "...",
    "options": ["...","...","...","..."],
    "correctAnswer": 0,
    "questionType": "DETAIL",             // MAIN_TOPIC|DETAIL|INFERENCE|PURPOSE|ATTITUDE
    "explanation": "..."                  // min 30
  }],
  "keyVocabulary": ["...","...","..."],
  "difficulty": "EASY"
}
```

### 2.6 TOEFL Reading Passage Unit
Schema: `TOEFLReadingPassageOnlySchema`. Bank = array:
```jsonc
{
  "passage": {
    "title":"...", "author":"...", "source":"...",
    "wordCount": 600,                      // 500-800
    "content":"...",                       // min 500 char
    "topicCategory":"NATURAL_SCIENCE",     // 8 enum
    "complexity":"ACADEMIC"                // ACADEMIC|TECHNICAL|GENERAL
  },
  "vocabularyInContext": [ /* min 5 */ {
    "word":"...","paragraph":1,"context":"...","meaningInContext":"..."
  }],
  "questions": [ /* min 15 (passage1,2) / 20 (passage3) */ {
    "questionNumber":1,
    "questionText":"...",
    "options":["...","...","...","..."],
    "correctAnswer":0,
    "questionType":"MAIN_IDEA",            // 10 enum
    "paragraphReference":1,
    "explanation":"..."                    // min 30
  }],
  "difficulty":"MEDIUM",
  "type":"READING_PASSAGE"
}
```
Distribusi: passage1=Q1-15, passage2=Q16-30, passage3=Q31-50 (sesuai `getToeflReadingPassageConfigs`).

### 2.7 TOEFL Structure
Schema: `TOEFLStructureQuestionItemSchema`. Bank = array entry, tiap entry punya `questions[]`:
```jsonc
{
  "type":"STRUCTURE",
  "questionText":"TOEFL Structure & Written Expression",
  "difficulty":"MEDIUM",
  "questions": [ /* banyak */ {
    "questionNumber":1,
    "questionText":"...",
    "sentenceType":"COMPLETION",            // COMPLETION|ERROR_IDENTIFICATION
    "sentence":"...",                       // min 20
    "underlinedParts":[ {"text":"...","index":1,"isCorrectAnswer":false} ], // optional
    "options":["...","...","...","..."],
    "correctAnswer":0,
    "grammarTopic":"SUBJECT_VERB_AGREEMENT",// 18 enum
    "explanation":{
      "correctAnswer":"...",
      "grammarRule":"...",
      "example":"...",
      "commonMistake":"..."
    }
  }]
}
```
Loader `loadToeflStructure` mengambil SEMUA questions dari semua entry, lalu shuffle & ambil 40.

---

## 3. Target Struktur Direktori Akhir

```
src/server/fallback/
├─ PLAN.md                      (file ini)
├─ loader.ts                    (diperbaiki fase 0 + tambah writing loader fase 5)
├─ ielts/
│  ├─ listening/
│  │  ├─ section-1.json         (array; 30 entry, campur EASY/MEDIUM/HARD)
│  │  ├─ section-2.json
│  │  ├─ section-3.json
│  │  ├─ section-4.json
│  │  └─ section-5.json
│  ├─ reading/
│  │  ├─ passage-1.json         (10 entry)
│  │  ├─ passage-2.json
│  │  └─ passage-3.json
│  └─ writing/
│     ├─ task-1.json            (10 entry)
│     └─ task-2.json
└─ toefl/
   ├─ listening/
   │  ├─ part-a/bank.json
   │  ├─ part-b/bank.json
   │  ├─ part-c/bank.json
   │  ├─ part-d/bank.json
   │  └─ part-e/bank.json
   ├─ reading/
   │  ├─ passage-1.json         (10 entry)
   │  ├─ passage-2.json
   │  └─ passage-3.json
   └─ structure/
      └─ bank.json              (1 entry dgn 120+ questions)
```

### 3.1 Kuota minimum entry agar variasi cukup
| Bank | Min entry | Alasan |
|---|---|---|
| IELTS listening section-1..5 | 30 / section | 5 section x 30 = 150 unit |
| IELTS reading passage-1,2,3 | 10 / index | 30 unit |
| IELTS writing task-1 | 10 | |
| IELTS writing task-2 | 10 | |
| TOEFL listening part-a..e | 30 / part | 5 part x 30 = 150 unit |
| TOEFL reading passage-1,2,3 | 10 / index | 30 unit |
| TOEFL structure bank | 1 file, 120+ Q | loader shuffle ambil 40 |

**Total estimasi unit: ~390 entry** (soal pilihan ganda: ribuan).

### 3.2 Keragaman yang dijamin
- Difficulty: setiap bank WAJIB punya **25% EASY, 50% MEDIUM, 25% HARD**
  (keputusan user: mayoritas MEDIUM).
- Tema: tiap entry harus topic/setting/academicField berbeda agar tidak monoton.
- Tipe soal IELTS reading: campur MULTIPLE_CHOICE / TRUE_FALSE_NOT_GIVEN / MATCHING_* / COMPLETION.
- Accent speaker IELTS: rotasi BRITISH/AMERICAN/AUSTRALIAN/CANADIAN.

---

## 4. Rencana Eksekusi Bertahap (Fase)

> Tiap fase menghasilkan satu kategori file JSON yang bisa direview terpisah.
> Setelah tiap fase: (a) jalankan `npx tsc --noEmit` untuk memastikan import valid,
> (b) saya laporkan ringkasan perubahan agar Anda review.

### FASE 0 — Perbaikan fondasi (SEBELUM bank baru)
1. Perbaiki semua path import statis di `loader.ts` agar cocok dengan disk (lihat §1.3).
2. Hapus import `toefl/structure.json`, `ielts/reading-passage-*.json` yang belum ada,
   ganti dengan path baru sesuai struktur target (buat stub bank kosong `[]` dulu bila perlu).
3. Pastikan `npx tsc --noEmit` lolos.
4. Komit terpisah "fix(fallback): align import paths with on-disk layout".

### FASE 1 — IELTS Listening (5 section)
- Buat/perkaya `ielts/listening/section-{1..5}.json` hingga 30 entry/section.
- Pastikan field `context.setting` sesuai §2.1 dan accent bervariasi.
- Validator: parsing tiap file dengan `IELTSListeningSectionSchema`.

### FASE 2 — IELTS Reading (3 passage)
- Buat `ielts/reading/passage-{1..3}.json` (10 entry/index).
- Campur tipe soal sesuai distribusi §2.2.
- Validator: `IELTSReadingPassageOnlySchema`.

### FASE 3 — TOEFL Listening (5 part)
- Perkaya `toefl/listening/part-{a..e}/bank.json` hingga 30 entry/part.
- Part E wajib `academicField` + `lectureTopic`.
- Validator: `TOEFLListeningPart{A..E}Schema`.

### FASE 4 — TOEFL Reading & Structure
- `toefl/reading/passage-{1..3}.json` 10 entry/index.
- `toefl/structure/bank.json` 1 file 120+ Q, grammarTopic tersebar.
- Validator: `TOEFLReadingPassageOnlySchema`, `TOEFLStructureQuestionItemSchema`.

### FASE 5 — IELTS Writing (BARU, butuh loader baru)
- Buat `ielts/writing/task-1.json` (10 entry) & `task-2.json` (10 entry).
- Tambah fungsi `loadIeltsWritingTask1/2` di `loader.ts`.
- Tambah case `/ielts/writing/task-1|2` & `/ielts/complete-writing` untuk `useFallback` di `questions.ts`.
- Validator: `IELTSWritingTask1Schema`, `IELTSWritingTask2Schema`.

### FASE 6 — Verifikasi akhir
- `npx tsc --noEmit`.
- Jalankan dev server, set `AI_GENERATE=false`, hit setiap endpoint via curl, pastikan 200 OK.
- Jalankan ulang dengan `AI_GENERATE=true` (default) untuk memastikan AI path tidak rusak.

---

## 5. Aturan Mutu Konten (Quality Gate tiap Bank)

Setiap entry HARUS:
1. Lolos Zod schema yang relevan (otomatis dicek loader).
2. Punya tepat 10 questions (Listening) atau jumlah sesuai passage config (Reading).
3. `audioScript` dimulai dengan baris `Situation: ...` lalu dialog dgn nama lengkap speaker.
4. `correctAnswer` numerik 0..3 dan jawaban benar benar-benar opsi ke-`correctAnswer`.
5. `difficulty` diisi dan distribusi bank seimbang (§3.2).
6. Tidak ada duplikat narasi/tema dalam bank yang sama.
7. Tidak ada data sensitif / kredensial / teks berhak cipta word-for-word.
8. Bahasa Inggris akademis yang alami; distractor plausible.

---

## 6. Checklist Progres (update saat tiap fase selesai)

- [x] FASE 0 - Audit & rencana (file ini ditulis)
- [x] FASE 0 - Perbaiki import path loader.ts + stub bank hilang
- [x] FASE 0 - tsc --noEmit lolos
- [ ] FASE 1 - IELTS Listening 5 section x 30 entry (target: 25%E/50%M/25%H)
    - [ ] section-1: 14/30 (E=3, M=9, H=2) - batch 3 selesai, lanjut batch 4
    - [ ] section-2: 2/30
    - [ ] section-3: 2/30
    - [ ] section-4: 2/30
    - [ ] section-5: 2/30
- [ ] FASE 2 - IELTS Reading 3 passage x 10 entry
    - [x] passage-1: 1/10 stub (Vertical Farming)
    - [x] passage-2: 1/10 stub (Color Marketing)
    - [x] passage-3: 1/10 stub (Swarm Intelligence)
- [ ] FASE 3 - TOEFL Listening 5 part x 30 entry
- [ ] FASE 4 - TOEFL Reading 3 passage x 10 entry + structure 120 Q
    - [x] structure stub: 30/120 Q
- [ ] FASE 5 - IELTS Writing task-1 & task-2 + loader baru (disetujui user)
- [ ] FASE 6 - Verifikasi tsc + runtime AI_GENERATE=false & true

---

## 7. Catatan Implementasi untuk Droid

- Saat menulis bank besar, buat dalam batch (mis. 10 entry dulu → review → lanjut 20).
- Gunakan `Create` tool untuk file baru; `Edit` untuk loader.ts.
- Jangan mengubah Zod schema tanpa persetujuan (bisa break AI engine).
- Untuk writing fallback (FASE 5), perlu update `questions.ts` dispatcher juga.
- Selalu sebutkan di laporan: jumlah entry, distribusi difficulty, topik yang dipakai.
