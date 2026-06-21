const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { connectDb } = require('../src/db');
const { getEnv } = require('../src/utils/env');
const { User } = require('../src/models/User');
const { HeroSlide } = require('../src/models/HeroSlide');
const { Course } = require('../src/models/Course');
const { Lesson } = require('../src/models/Lesson');
const { Quiz, Question } = require('../src/models/Quiz');

async function upsertUser({ name, email, password, role }) {
  const existing = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.passwordHash = passwordHash;
    await existing.save();
    return existing;
  }
  return User.create({ name, email, role, passwordHash });
}

async function main() {
  dotenv.config();
  const env = getEnv();
  await connectDb(env.MONGO_URI);

  const admin = await upsertUser({
    name: 'Admin',
    email: 'admin@lms.local',
    password: 'admin123',
    role: 'admin',
  });

  await upsertUser({
    name: 'Maskiryz',
    email: 'maskiryz23@gmail.com',
    password: 'opet123',
    role: 'admin',
  });

  const teacher = await upsertUser({
    name: 'Teacher',
    email: 'teacher@lms.local',
    password: 'teacher123',
    role: 'teacher',
  });

  await HeroSlide.deleteMany({});
  await HeroSlide.insertMany([
    {
      title: 'Belajar Skill Baru, Setiap Hari',
      subtitle: 'Course singkat + quiz interaktif.',
      ctaText: 'Lihat Course',
      ctaHref: '/courses',
      imageUrl: '/hero-34.png',
      order: 1,
      isActive: true,
    },
    {
      title: 'Belajar Skill Baru, Setiap Hari',
      subtitle: 'Course singkat + quiz interaktif.',
      ctaText: 'Lihat Course',
      ctaHref: '/courses',
      imageUrl: '/hero-35.png',
      order: 2,
      isActive: true,
    },
  ]);

  // Create a sample course (owned by teacher)
  const course = await Course.findOneAndUpdate(
    { title: 'React Dasar untuk Pemula' },
    {
      title: 'React Dasar untuk Pemula',
      description: 'Mulai dari component, props, state, sampai bikin mini app.',
      coverImageUrl: '',
      ownerId: teacher._id,
      isPublished: true,
    },
    { upsert: true, new: true }
  );

  await Lesson.deleteMany({ courseId: course._id });
  await Lesson.insertMany([
    {
      courseId: course._id,
      title: '1. Pengenalan React',
      order: 1,
      isPublished: true,
      contentMarkdown:
        '# Pengenalan React\n\nReact adalah library untuk membangun UI.\n\n- Component\n- Props\n- State\n',
    },
    {
      courseId: course._id,
      title: '2. State dan Event',
      order: 2,
      isPublished: true,
      contentMarkdown:
        '# State & Event\n\nGunakan `useState` untuk menyimpan state, dan event handler untuk interaksi.\n',
    },
  ]);

  // Sample quiz
  const quiz = await Quiz.findOneAndUpdate(
    { courseId: course._id, title: 'Quiz Cepat: React Dasar' },
    {
      courseId: course._id,
      lessonId: null,
      title: 'Quiz Cepat: React Dasar',
      description: 'Cek pemahaman kamu.',
      timeLimitSec: 0,
      isPublished: true,
    },
    { upsert: true, new: true }
  );

  // Attach quiz to the first lesson for lesson-based flow
  const firstLesson = await Lesson.findOne({ courseId: course._id, order: 1 });
  if (firstLesson) {
    await Lesson.findByIdAndUpdate(firstLesson._id, { quizId: quiz._id });
    await Quiz.findByIdAndUpdate(quiz._id, { lessonId: firstLesson._id });
  }

  await Question.deleteMany({ quizId: quiz._id });
  await Question.insertMany([
    {
      quizId: quiz._id,
      order: 1,
      prompt: 'React itu apa?',
      choices: [
        { id: 'a', text: 'Framework backend' },
        { id: 'b', text: 'Library untuk membangun UI' },
        { id: 'c', text: 'Database' },
      ],
      correctChoiceId: 'b',
    },
    {
      quizId: quiz._id,
      order: 2,
      prompt: 'Hook untuk state di function component?',
      choices: [
        { id: 'a', text: 'useState' },
        { id: 'b', text: 'useFetch' },
        { id: 'c', text: 'useClass' },
      ],
      correctChoiceId: 'a',
    },
  ]);

  // ==========================================================
  // AI Course (5 lessons, each with 50-question quiz)
  // ==========================================================

  function makeMcq({ quizId, order, prompt, choices, correctChoiceId }) {
    return {
      quizId,
      order,
      type: 'mcq',
      prompt,
      choices,
      correctChoiceId,
    };
  }

  function pickDeterministic(arr, idx) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr[idx % arr.length];
  }

  const aiCourse = await Course.findOneAndUpdate(
    { title: 'AI untuk Pemula: Dari Konsep sampai Praktik' },
    {
      title: 'AI untuk Pemula: Dari Konsep sampai Praktik',
      description:
        'Belajar AI dari dasar: data, machine learning, deep learning, LLM, prompt, dan etika. Setiap materi ada quiz 50 soal.',
      coverImageUrl: '',
      ownerId: teacher._id,
      isPublished: true,
      priceIdr: 0,
    },
    { upsert: true, new: true }
  );

  // Cleanup existing lessons/quizzes/questions for this course (idempotent seed)
  const existingAiQuizzes = await Quiz.find({ courseId: aiCourse._id }).select('_id');
  const existingAiQuizIds = (existingAiQuizzes || []).map((q) => q._id);
  if (existingAiQuizIds.length > 0) {
    await Question.deleteMany({ quizId: { $in: existingAiQuizIds } });
    await Quiz.deleteMany({ _id: { $in: existingAiQuizIds } });
  }
  await Lesson.deleteMany({ courseId: aiCourse._id });

  const aiLessonsSpec = [
    {
      order: 1,
      title: '1. Pengenalan AI & Cara Berpikir Sistem AI',
      contentHtml:
        '<h2>Gambaran Umum</h2><p>Artificial Intelligence (AI) adalah bidang yang membuat komputer mampu melakukan tugas yang biasanya membutuhkan kecerdasan manusia (mis. mengenali pola, memahami bahasa, membuat keputusan).</p>' +
        '<h2>Konsep Kunci</h2><ul><li>AI vs Machine Learning vs Deep Learning</li><li>Data, fitur, label</li><li>Model, training, inference</li></ul>' +
        '<h2>Contoh</h2><p>Rekomendasi produk, deteksi spam, OCR, chatbot.</p>' +
        '<h2>Ringkasan</h2><ul><li>AI adalah payung besar</li><li>ML adalah cara belajar dari data</li><li>Deep Learning adalah subset ML</li></ul>',
      quizTitle: 'Quiz Materi 1: Pengenalan AI',
      quizDescription: 'Dasar istilah, alur training-inference, dan contoh penerapan.',
      concepts: ['AI', 'Machine Learning', 'Deep Learning', 'Data', 'Model', 'Training', 'Inference', 'Fitur', 'Label'],
    },
    {
      order: 2,
      title: '2. Data untuk AI: Dataset, Kualitas, dan Preprocessing',
      contentHtml:
        '<h2>Gambaran Umum</h2><p>Kualitas model sangat dipengaruhi kualitas data. Tahap data mencakup pengumpulan, pembersihan, dan transformasi.</p>' +
        '<h2>Konsep Kunci</h2><ul><li>Missing values</li><li>Outlier</li><li>Train/validation/test split</li><li>Normalisasi & encoding</li></ul>' +
        '<h2>Praktik</h2><p>Membersihkan data duplikat, mengisi nilai kosong, dan menyiapkan fitur numerik/kategorikal.</p>' +
        '<h2>Ringkasan</h2><ul><li>Data leakage harus dihindari</li><li>Split sebelum fit scaler/encoder</li><li>Gunakan metrik yang tepat</li></ul>',
      quizTitle: 'Quiz Materi 2: Data & Preprocessing',
      quizDescription: 'Dataset, split, data leakage, dan preprocessing dasar.',
      concepts: ['Dataset', 'Missing Value', 'Outlier', 'Train/Test Split', 'Data Leakage', 'Normalisasi', 'Encoding', 'Feature Engineering'],
    },
    {
      order: 3,
      title: '3. Machine Learning Dasar: Supervised vs Unsupervised',
      contentHtml:
        '<h2>Gambaran Umum</h2><p>Machine Learning adalah pendekatan membuat sistem belajar pola dari data. Terdapat supervised dan unsupervised learning.</p>' +
        '<h2>Konsep Kunci</h2><ul><li>Klasifikasi vs regresi</li><li>Clustering</li><li>Overfitting vs underfitting</li><li>Evaluasi: accuracy, precision, recall</li></ul>' +
        '<h2>Ringkasan</h2><ul><li>Pilih model sesuai masalah</li><li>Gunakan validasi untuk tuning</li><li>Periksa bias & kesalahan</li></ul>',
      quizTitle: 'Quiz Materi 3: Machine Learning',
      quizDescription: 'Supervised/unsupervised, overfitting, metrik evaluasi.',
      concepts: ['Supervised', 'Unsupervised', 'Klasifikasi', 'Regresi', 'Clustering', 'Overfitting', 'Underfitting', 'Accuracy', 'Precision', 'Recall'],
    },
    {
      order: 4,
      title: '4. Deep Learning & Neural Network: Intuisi Praktis',
      contentHtml:
        '<h2>Gambaran Umum</h2><p>Deep Learning memakai jaringan saraf berlapis untuk memodelkan pola kompleks seperti gambar, suara, dan teks.</p>' +
        '<h2>Konsep Kunci</h2><ul><li>Neuron, layer, activation</li><li>Backpropagation</li><li>Epoch, batch, learning rate</li><li>Regularisasi (dropout)</li></ul>' +
        '<h2>Ringkasan</h2><ul><li>DL butuh data & komputasi lebih</li><li>Hyperparameter penting</li><li>Monitor training/validation loss</li></ul>',
      quizTitle: 'Quiz Materi 4: Deep Learning',
      quizDescription: 'Neural network, training loop, hyperparameter, regularisasi.',
      concepts: ['Neural Network', 'Layer', 'Activation', 'Backpropagation', 'Epoch', 'Batch', 'Learning Rate', 'Dropout', 'Loss'],
    },
    {
      order: 5,
      title: '5. LLM, Prompting, dan Etika AI',
      contentHtml:
        '<h2>Gambaran Umum</h2><p>LLM (Large Language Model) mempelajari pola bahasa dari data teks skala besar. Prompting membantu mengarahkan output.</p>' +
        '<h2>Konsep Kunci</h2><ul><li>Prompt, konteks, instruksi</li><li>Hallucination</li><li>Evaluasi jawaban</li><li>Etika: bias, privasi, keamanan</li></ul>' +
        '<h2>Ringkasan</h2><ul><li>LLM tidak selalu benar</li><li>Gunakan verifikasi/fakta</li><li>Pertimbangkan dampak sosial</li></ul>',
      quizTitle: 'Quiz Materi 5: LLM & Etika',
      quizDescription: 'Prompting, limitasi LLM, dan prinsip etika penggunaan AI.',
      concepts: ['LLM', 'Prompt', 'Context', 'Instruction', 'Hallucination', 'Bias', 'Privacy', 'Safety', 'Evaluation'],
    },
  ];

  const aiLessons = await Lesson.insertMany(
    aiLessonsSpec.map((l) => ({
      courseId: aiCourse._id,
      title: l.title,
      order: l.order,
      isPublished: true,
      contentHtml: l.contentHtml,
      contentMarkdown: '',
      videoEmbedUrl: '',
      attachments: [],
      contentBlocks: [
        { type: 'content', title: 'Materi' },
        { type: 'attachments', title: 'Lampiran' },
      ],
    }))
  );

  for (let i = 0; i < aiLessons.length; i++) {
    const lesson = aiLessons[i];
    const spec = aiLessonsSpec[i];

    const lessonQuiz = await Quiz.create({
      courseId: aiCourse._id,
      lessonId: lesson._id,
      title: spec.quizTitle,
      description: spec.quizDescription,
      timeLimitSec: 0,
      randomizeQuestions: false,
      isPublished: true,
    });

    await Lesson.findByIdAndUpdate(lesson._id, { quizId: lessonQuiz._id });

    const commonChoices = [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ];

    const qDocs = [];
    for (let n = 0; n < 50; n++) {
      const c1 = pickDeterministic(spec.concepts, n);
      const c2 = pickDeterministic(spec.concepts, n + 1);
      const c3 = pickDeterministic(spec.concepts, n + 2);

      // Create a varied but deterministic set of MCQ prompts
      const variant = n % 5;
      let prompt;
      let choices;
      let correctChoiceId;

      if (variant === 0) {
        prompt = `Manakah pernyataan yang paling tepat tentang \"${c1}\"?`;
        choices = [
          { ...commonChoices[0], text: `Konsep inti dalam materi ini yang perlu dipahami konteksnya` },
          { ...commonChoices[1], text: `Nama bahasa pemrograman untuk membuat aplikasi mobile` },
          { ...commonChoices[2], text: `Istilah untuk perangkat keras penyimpanan data` },
          { ...commonChoices[3], text: `Jenis file gambar berformat kompresi` },
        ];
        correctChoiceId = 'a';
      } else if (variant === 1) {
        prompt = `Dalam alur kerja AI/ML, apa urutan yang paling benar?`;
        choices = [
          { ...commonChoices[0], text: 'Deploy → Kumpulkan data → Training → Evaluasi' },
          { ...commonChoices[1], text: 'Kumpulkan data → Training → Evaluasi → Inference/Deploy' },
          { ...commonChoices[2], text: 'Evaluasi → Training → Kumpulkan data → Deploy' },
          { ...commonChoices[3], text: 'Inference → Evaluasi → Kumpulkan data → Training' },
        ];
        correctChoiceId = 'b';
      } else if (variant === 2) {
        prompt = `Contoh paling sesuai untuk \"${c1}\" adalah...`;
        choices = [
          { ...commonChoices[0], text: `Menggunakan ${c1} untuk membuat prediksi/keputusan berbasis pola` },
          { ...commonChoices[1], text: `Mengganti keyboard komputer dengan monitor baru` },
          { ...commonChoices[2], text: `Menghapus file cache browser untuk mempercepat internet` },
          { ...commonChoices[3], text: `Mengatur resolusi layar agar lebih tajam` },
        ];
        correctChoiceId = 'a';
      } else if (variant === 3) {
        prompt = `Manakah yang termasuk risiko/masalah yang perlu diwaspadai?`;
        choices = [
          { ...commonChoices[0], text: `Data leakage atau evaluasi yang tidak adil` },
          { ...commonChoices[1], text: `Menggunakan mouse wireless` },
          { ...commonChoices[2], text: `Memilih wallpaper gelap` },
          { ...commonChoices[3], text: `Mengaktifkan mode airplane` },
        ];
        correctChoiceId = 'a';
      } else {
        prompt = `Jika \"${c1}\" dan \"${c2}\" sering tertukar, cara membedakannya yang paling tepat adalah...`;
        choices = [
          { ...commonChoices[0], text: `Lihat definisi dan peran: ${c1} vs ${c2} dalam sistem` },
          { ...commonChoices[1], text: `Bandingkan ukuran file dan ekstensi dokumen` },
          { ...commonChoices[2], text: `Lihat warna ikon aplikasi di desktop` },
          { ...commonChoices[3], text: `Cek versi OS yang terpasang` },
        ];
        correctChoiceId = 'a';
      }

      // Lightly specialize a subset of questions per lesson to reduce repetition
      if (spec.order === 2 && n % 10 === 0) {
        prompt = `Kapan sebaiknya melakukan split train/validation/test agar menghindari data leakage?`;
        choices = [
          { ...commonChoices[0], text: 'Sesudah melakukan normalisasi pada seluruh dataset' },
          { ...commonChoices[1], text: 'Sebelum fit normalisasi/encoding (fit hanya di data train)' },
          { ...commonChoices[2], text: 'Hanya saat model sudah dideploy' },
          { ...commonChoices[3], text: 'Tidak perlu split jika datanya banyak' },
        ];
        correctChoiceId = 'b';
      }
      if (spec.order === 3 && n % 10 === 1) {
        prompt = `Metrik mana yang paling tepat saat data kelas tidak seimbang (imbalanced)?`;
        choices = [
          { ...commonChoices[0], text: 'Hanya accuracy' },
          { ...commonChoices[1], text: 'Precision/Recall (atau F1) lebih informatif' },
          { ...commonChoices[2], text: 'Tidak perlu metrik, cukup lihat loss' },
          { ...commonChoices[3], text: 'Selalu gunakan MSE' },
        ];
        correctChoiceId = 'b';
      }
      if (spec.order === 4 && n % 10 === 2) {
        prompt = `Fungsi learning rate pada training neural network paling tepat adalah...`;
        choices = [
          { ...commonChoices[0], text: 'Menentukan jumlah neuron di layer terakhir' },
          { ...commonChoices[1], text: 'Mengatur besar langkah update parameter saat optimisasi' },
          { ...commonChoices[2], text: 'Mengubah jumlah data training' },
          { ...commonChoices[3], text: 'Menghapus kebutuhan validasi' },
        ];
        correctChoiceId = 'b';
      }
      if (spec.order === 5 && n % 10 === 3) {
        prompt = `Apa maksud \"hallucination\" pada LLM?`;
        choices = [
          { ...commonChoices[0], text: 'Model selalu mengutip sumber resmi' },
          { ...commonChoices[1], text: 'Model menghasilkan jawaban yang terdengar meyakinkan tapi salah/tidak berdasar' },
          { ...commonChoices[2], text: 'Model menolak semua pertanyaan' },
          { ...commonChoices[3], text: 'Model hanya menjawab dengan angka' },
        ];
        correctChoiceId = 'b';
      }

      // Inject an extra concept to keep prompts varied
      if (n % 7 === 0 && c3) {
        prompt = `${prompt} (Kaitan dengan: ${c3})`;
      }

      qDocs.push(
        makeMcq({
          quizId: lessonQuiz._id,
          order: n + 1,
          prompt,
          choices,
          correctChoiceId,
        })
      );
    }

    await Question.insertMany(qDocs);
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  // eslint-disable-next-line no-console
  console.log('Admin: admin@lms.local / admin123');
  // eslint-disable-next-line no-console
  console.log('Teacher: teacher@lms.local / teacher123');
  // eslint-disable-next-line no-console
  console.log('Student: register from UI');
  // eslint-disable-next-line no-console
  console.log('AI Course created: AI untuk Pemula: Dari Konsep sampai Praktik (5 lessons, 5 quizzes x 50 questions)');

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
