import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const LOP1_TOPICS = [
  {
    slug: "chao-hoi",
    title: "Chào hỏi & Làm quen",
    iconLabel: "Hi",
    lessons: [
      {
        slug: "bai-1-lam-quen",
        title: "Bài 1: Làm quen lần đầu",
        description: "Hello, Hi, Nice to meet you.",
        vocabCount: 11,
        grammarCount: 2,
        dialogueCount: 1,
        durationMin: 12,
        content:
          "Học cách chào hỏi cơ bản: Hello / Hi / Good morning. Luyện mẫu câu Nice to meet you.",
      },
      {
        slug: "bai-2-gioi-thieu-ten",
        title: "Bài 2: Giới thiệu tên",
        description: "My name is… / What's your name?",
        vocabCount: 8,
        grammarCount: 1,
        dialogueCount: 1,
        durationMin: 10,
        content: "Giới thiệu tên và hỏi tên người khác bằng mẫu câu đơn giản.",
      },
      {
        slug: "bai-3-chao-theo-buoi",
        title: "Bài 3: Chào theo buổi",
        description: "Good morning / afternoon / evening / night.",
        vocabCount: 6,
        grammarCount: 1,
        dialogueCount: 1,
        durationMin: 10,
      },
    ],
  },
  {
    slug: "gia-dinh",
    title: "Gia đình & Người thân",
    iconLabel: "Fam",
    lessons: [
      {
        slug: "bai-4-thanh-vien-gia-dinh",
        title: "Bài 4: Thành viên gia đình",
        description: "father, mother, brother, sister…",
        vocabCount: 12,
        grammarCount: 2,
        dialogueCount: 1,
        durationMin: 14,
      },
      {
        slug: "bai-5-mo-ta-gia-dinh",
        title: "Bài 5: Mô tả gia đình",
        description: "This is my… / I have…",
        vocabCount: 9,
        grammarCount: 2,
        dialogueCount: 1,
        durationMin: 12,
      },
    ],
  },
  {
    slug: "so-dem",
    title: "Số đếm, Thời gian & Ngày tháng",
    iconLabel: "123",
    lessons: [
      {
        slug: "bai-6-so-dem-1-20",
        title: "Bài 6: Số đếm 1–20",
        description: "Numbers one to twenty.",
        vocabCount: 20,
        grammarCount: 1,
        dialogueCount: 0,
        durationMin: 15,
      },
      {
        slug: "bai-7-ngay-trong-tuan",
        title: "Bài 7: Ngày trong tuần",
        description: "Monday to Sunday.",
        vocabCount: 10,
        grammarCount: 1,
        dialogueCount: 1,
        durationMin: 12,
      },
      {
        slug: "bai-8-hoi-gio",
        title: "Bài 8: Hỏi giờ",
        description: "What time is it?",
        vocabCount: 8,
        grammarCount: 2,
        dialogueCount: 1,
        durationMin: 13,
      },
    ],
  },
  {
    slug: "an-uong",
    title: "Ăn uống hằng ngày",
    iconLabel: "Eat",
    lessons: [
      {
        slug: "bai-9-thuc-an-co-ban",
        title: "Bài 9: Thức ăn cơ bản",
        description: "rice, bread, water, milk…",
        vocabCount: 15,
        grammarCount: 1,
        dialogueCount: 1,
        durationMin: 14,
      },
      {
        slug: "bai-10-goi-mon",
        title: "Bài 10: Gọi món",
        description: "I'd like… / Can I have…?",
        vocabCount: 10,
        grammarCount: 2,
        dialogueCount: 1,
        durationMin: 12,
      },
    ],
  },
  {
    slug: "mua-sam",
    title: "Mua sắm & Giá cả",
    iconLabel: "$",
    lessons: [
      {
        slug: "bai-11-o-cua-hang",
        title: "Bài 11: Ở cửa hàng",
        description: "How much is this?",
        vocabCount: 12,
        grammarCount: 2,
        dialogueCount: 1,
        durationMin: 14,
      },
      {
        slug: "bai-12-tra-tien",
        title: "Bài 12: Trả tiền",
        description: "cash, card, receipt.",
        vocabCount: 8,
        grammarCount: 1,
        dialogueCount: 1,
        durationMin: 11,
      },
    ],
  },
];

const PRACTICE_SEED = [
  {
    type: "WORD_ORDER" as const,
    prompt: "Sắp xếp các từ thành câu chào hỏi.",
    instruction: "Kéo / chọn từ theo đúng thứ tự",
    payload: { tokens: ["Hello", "my", "name", "is", "Lan"] },
    answer: ["Hello", "my", "name", "is", "Lan"],
  },
  {
    type: "WORD_ORDER" as const,
    prompt: "Ghép câu hỏi tên.",
    instruction: "Word order",
    payload: { tokens: ["What", "is", "your", "name"] },
    answer: ["What", "is", "your", "name"],
  },
  {
    type: "WORD_ORDER" as const,
    prompt: "Ghép câu giới thiệu gia đình.",
    instruction: "Word order",
    payload: { tokens: ["This", "is", "my", "mother"] },
    answer: ["This", "is", "my", "mother"],
  },
  {
    type: "FILL_BLANK" as const,
    prompt: "Chọn từ đúng để điền vào chỗ trống.",
    instruction: "Fill in the blank",
    payload: {
      sentence: "Nice to ____ you.",
      options: ["meet", "meat", "met", "mate"],
    },
    answer: "meet",
  },
  {
    type: "FILL_BLANK" as const,
    prompt: "Chọn động từ phù hợp.",
    instruction: "Fill in the blank",
    payload: {
      sentence: "I ____ a student.",
      options: ["am", "is", "are", "be"],
    },
    answer: "am",
  },
  {
    type: "FILL_BLANK" as const,
    prompt: "Điền từ hỏi giá.",
    instruction: "Fill in the blank",
    payload: {
      sentence: "How ____ is this?",
      options: ["much", "many", "more", "most"],
    },
    answer: "much",
  },
  {
    type: "LISTENING_FILL" as const,
    prompt: "Nghe và chọn từ còn thiếu.",
    instruction: "Listening fill",
    payload: {
      transcript: "Good morning, class!",
      sentence: "Good ____, class!",
      options: ["morning", "night", "bye", "food"],
    },
    answer: "morning",
  },
  {
    type: "LISTENING_FILL" as const,
    prompt: "Nghe câu giới thiệu.",
    instruction: "Listening fill",
    payload: {
      transcript: "My name is Tom.",
      sentence: "My name is ____.",
      options: ["Tom", "Mom", "Home", "Some"],
    },
    answer: "Tom",
  },
  {
    type: "LISTENING_ORDER" as const,
    prompt: "Sắp xếp các câu hội thoại theo đúng thứ tự.",
    instruction: "Listening order",
    payload: {
      transcript: "A short greeting dialogue",
      turns: ["Hi!", "Hello!", "How are you?", "I'm fine, thanks."],
    },
    answer: ["Hi!", "Hello!", "How are you?", "I'm fine, thanks."],
  },
  {
    type: "LISTENING_ORDER" as const,
    prompt: "Sắp xếp đoạn hội thoại ở cửa hàng.",
    instruction: "Listening order",
    payload: {
      turns: [
        "Can I help you?",
        "Yes, how much is this?",
        "It's five dollars.",
        "Thank you!",
      ],
    },
    answer: [
      "Can I help you?",
      "Yes, how much is this?",
      "It's five dollars.",
      "Thank you!",
    ],
  },
  {
    type: "CLOZE_READING" as const,
    prompt: "Đọc đoạn văn và chọn từ còn thiếu.",
    instruction: "Cloze reading",
    payload: {
      passage:
        "Hello! My name is Minh. I am seven years old. I _____ to school every day.",
      options: ["go", "goes", "going", "went"],
    },
    answer: "go",
  },
  {
    type: "CLOZE_READING" as const,
    prompt: "Đoán từ dựa vào ngữ cảnh.",
    instruction: "Cloze reading",
    payload: {
      passage:
        "This is my family. My _____ is a teacher. She teaches English.",
      options: ["mother", "brother", "dog", "book"],
    },
    answer: "mother",
  },
];

const EXAM_SEED = [
  {
    slug: "de-luyen-1",
    title: "Đề luyện 1",
    difficulty: "BASIC" as const,
    durationMin: 20,
    totalPoints: 100,
    sortOrder: 1,
    questions: [
      {
        id: "q1",
        prompt: "Chọn lời chào buổi sáng đúng:",
        options: ["Good morning", "Good night", "Good bye", "Good luck"],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: '"Nice to meet you" nghĩa là:',
        options: [
          "Rất vui được gặp bạn",
          "Tạm biệt",
          "Xin lỗi",
          "Cảm ơn bạn",
        ],
        correctIndex: 0,
      },
      {
        id: "q3",
        prompt: "Điền từ: I ___ a boy.",
        options: ["am", "is", "are", "be"],
        correctIndex: 0,
      },
      {
        id: "q4",
        prompt: "Từ nào là thành viên gia đình?",
        options: ["mother", "table", "apple", "school"],
        correctIndex: 0,
      },
      {
        id: "q5",
        prompt: "How much is this? — dùng khi:",
        options: ["Hỏi giá", "Hỏi giờ", "Hỏi tên", "Hỏi tuổi"],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "de-luyen-2",
    title: "Đề luyện 2",
    difficulty: "BASIC" as const,
    durationMin: 25,
    totalPoints: 100,
    sortOrder: 2,
    questions: [
      {
        id: "q1",
        prompt: "Số 'twelve' là:",
        options: ["12", "2", "20", "22"],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: "What day is today? — hỏi về:",
        options: ["Ngày trong tuần", "Giá tiền", "Màu sắc", "Thức ăn"],
        correctIndex: 0,
      },
      {
        id: "q3",
        prompt: "I'd like some water. — muốn:",
        options: ["Một ít nước", "Một cuốn sách", "Một cái bàn", "Một người bạn"],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "de-tieu-chuan-1",
    title: "Đề tiêu chuẩn 1",
    difficulty: "STANDARD" as const,
    durationMin: 40,
    totalPoints: 100,
    sortOrder: 3,
    questions: [
      {
        id: "q1",
        prompt: "Chọn câu đúng ngữ pháp:",
        options: [
          "She is my sister.",
          "She am my sister.",
          "She are my sister.",
          "She be my sister.",
        ],
        correctIndex: 0,
      },
      {
        id: "q2",
        prompt: "Điền từ: ___ you like milk?",
        options: ["Do", "Does", "Is", "Are"],
        correctIndex: 0,
      },
      {
        id: "q3",
        prompt: "Opposite of 'big' là:",
        options: ["small", "tall", "long", "hot"],
        correctIndex: 0,
      },
      {
        id: "q4",
        prompt: "At the supermarket, bạn có thể mua:",
        options: ["bread", "homework", "teacher", "classroom"],
        correctIndex: 0,
      },
    ],
  },
];

async function main() {
  await prisma.practiceItem.deleteMany();
  await prisma.examPaper.deleteMany();
  await prisma.story.deleteMany();
  await prisma.vocabTopic.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.gradeLevel.deleteMany();
  await prisma.homeStat.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.dailyChallenge.deleteMany();
  await prisma.homeVideo.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      email: "demo@wewin.local",
      name: "Demo User",
      passwordHash,
    },
  });

  await prisma.homeStat.createMany({
    data: [
      { key: "lessons", label: "Bài học", value: "1.253+", sortOrder: 1 },
      { key: "vocab", label: "Từ vựng", value: "10.996+", sortOrder: 2 },
      { key: "exams", label: "Đề thi thử", value: "450+", sortOrder: 3 },
      { key: "levels", label: "Cấp độ", value: "9", sortOrder: 4 },
    ],
  });

  await prisma.partner.createMany({
    data: [
      {
        name: "Cô Minh Anh",
        center: "Trung tâm Anh ngữ HN",
        phone: "0901 234 567",
        sortOrder: 1,
      },
      {
        name: "Thầy Đức Long",
        center: "WEWIN Partner Academy",
        phone: "0912 345 678",
        sortOrder: 2,
      },
    ],
  });

  await prisma.dailyChallenge.createMany({
    data: [
      { title: "Hoàn thành 2 bài học", targetCount: 2, xpReward: 60, sortOrder: 1 },
      { title: "Ôn 10 từ vựng", targetCount: 10, xpReward: 60, sortOrder: 2 },
      { title: "Làm 1 đề thi thử", targetCount: 1, xpReward: 60, sortOrder: 3 },
    ],
  });

  await prisma.homeVideo.createMany({
    data: [
      { title: "Introduce yourself in English", youtubeId: "f-THLbSEZ4Y", sortOrder: 1 },
      { title: "My daily routine", youtubeId: "LG7ysbsDf30", sortOrder: 2 },
      { title: "At the supermarket", youtubeId: "1TjgNeLY3Os", sortOrder: 3 },
      { title: "Ngày đầu tiên đi học của tôi", youtubeId: "4lHwBZr66so", sortOrder: 4 },
      { title: "Talking about daily habits", sortOrder: 5 },
      { title: "Shopping at the supermarket", sortOrder: 6 },
    ],
  });

  await prisma.leaderboardEntry.createMany({
    data: [
      { name: "Trang Minh", level: 43, xp: 12500, sortOrder: 1 },
      { name: "van tran", level: 11, xp: 3200, sortOrder: 2 },
      { name: "Thư", level: 16, xp: 4100, sortOrder: 3 },
      { name: "Jessi", level: 9, xp: 2100, sortOrder: 4 },
      { name: "Kim Andrea", level: 8, xp: 1800, sortOrder: 5 },
    ],
  });

  const colors = [
    "#22c55e",
    "#0B1F5C",
    "#1D4ED8",
    "#D4A017",
    "#0B1F5C",
    "#071540",
    "#2563eb",
    "#D4A017",
    "#0B1F5C",
  ];

  for (let i = 1; i <= 9; i++) {
    const level = await prisma.gradeLevel.create({
      data: {
        slug: `lop-${i}`,
        level: i,
        title: `Lớp ${i}`,
        description:
          i === 1
            ? "Từ vựng có audio, ngữ pháp tiếng Việt và hội thoại thực tế — mỗi ngày 15 phút"
            : `Giáo trình tiếng Anh ${i === 9 ? "nâng cao" : `Lớp ${i}`} — chủ đề và bài học sẽ bổ sung dần.`,
        color: colors[i - 1],
        sortOrder: i,
      },
    });

    if (i === 1) {
      for (let t = 0; t < LOP1_TOPICS.length; t++) {
        const topicData = LOP1_TOPICS[t];
        const topic = await prisma.topic.create({
          data: {
            gradeLevelId: level.id,
            slug: topicData.slug,
            title: topicData.title,
            iconLabel: topicData.iconLabel,
            sortOrder: t + 1,
          },
        });

        for (let l = 0; l < topicData.lessons.length; l++) {
          const lesson = topicData.lessons[l];
          await prisma.lesson.create({
            data: {
              topicId: topic.id,
              slug: lesson.slug,
              title: lesson.title,
              description: lesson.description,
              vocabCount: lesson.vocabCount,
              grammarCount: lesson.grammarCount,
              dialogueCount: lesson.dialogueCount,
              durationMin: lesson.durationMin,
              content: lesson.content,
              sortOrder: l + 1,
            },
          });
        }
      }
    }
  }

  for (let i = 0; i < PRACTICE_SEED.length; i++) {
    const item = PRACTICE_SEED[i];
    await prisma.practiceItem.create({
      data: {
        type: item.type,
        level: 1,
        prompt: item.prompt,
        instruction: item.instruction,
        payload: item.payload,
        answer: item.answer,
        sortOrder: i + 1,
      },
    });
  }

  for (const exam of EXAM_SEED) {
    await prisma.examPaper.create({
      data: {
        level: 1,
        slug: exam.slug,
        title: exam.title,
        difficulty: exam.difficulty,
        durationMin: exam.durationMin,
        totalPoints: exam.totalPoints,
        questionCount: exam.questions.length,
        questions: exam.questions,
        sortOrder: exam.sortOrder,
      },
    });
  }

  await prisma.story.createMany({
    data: [
      {
        slug: "hello-lan",
        title: "Hello, I'm Lan",
        summary: "Lan chào bạn mới vào ngày đầu tiên đi học.",
        level: 1,
        readingMin: 4,
        coverLabel: "Truyện Lớp 1",
        body: "Hello! My name is Lan. I am seven years old. Today is my first day at school. I meet Tom. \"Hi, Tom!\" says Lan. \"Hi, Lan! Nice to meet you,\" says Tom. They smile and become friends.",
        sortOrder: 1,
      },
      {
        slug: "my-family",
        title: "My Family",
        summary: "Minh giới thiệu các thành viên trong gia đình.",
        level: 1,
        readingMin: 5,
        coverLabel: "Truyện Lớp 1",
        body: "This is my family. This is my father. He is a doctor. This is my mother. She is a teacher. I have one brother and one sister. We love each other.",
        sortOrder: 2,
      },
      {
        slug: "at-the-shop",
        title: "At the Shop",
        summary: "Mua bánh mì và sữa ở cửa hàng.",
        level: 1,
        readingMin: 5,
        coverLabel: "Truyện Lớp 1",
        body: "Lan goes to the shop. \"How much is the bread?\" she asks. \"It's ten thousand dong,\" says the seller. Lan buys bread and milk. \"Thank you!\" she says.",
        sortOrder: 3,
      },
    ],
  });

  await prisma.vocabTopic.createMany({
    data: [
      {
        slug: "greetings",
        title: "Chào hỏi",
        description: "Hello, Hi, Good morning…",
        wordCount: 12,
        level: 1,
        sortOrder: 1,
        words: [
          { en: "hello", vi: "xin chào" },
          { en: "hi", vi: "chào (thân mật)" },
          { en: "goodbye", vi: "tạm biệt" },
          { en: "good morning", vi: "chào buổi sáng" },
        ],
      },
      {
        slug: "family",
        title: "Gia đình",
        description: "father, mother, brother…",
        wordCount: 10,
        level: 1,
        sortOrder: 2,
        words: [
          { en: "father", vi: "bố" },
          { en: "mother", vi: "mẹ" },
          { en: "brother", vi: "anh/em trai" },
          { en: "sister", vi: "chị/em gái" },
        ],
      },
      {
        slug: "numbers",
        title: "Số đếm",
        description: "one to twenty",
        wordCount: 20,
        level: 1,
        sortOrder: 3,
        words: [
          { en: "one", vi: "một" },
          { en: "two", vi: "hai" },
          { en: "ten", vi: "mười" },
          { en: "twenty", vi: "hai mươi" },
        ],
      },
      {
        slug: "food",
        title: "Thức ăn & đồ uống",
        description: "rice, bread, water…",
        wordCount: 15,
        level: 1,
        sortOrder: 4,
        words: [
          { en: "rice", vi: "cơm / gạo" },
          { en: "bread", vi: "bánh mì" },
          { en: "water", vi: "nước" },
          { en: "milk", vi: "sữa" },
        ],
      },
    ],
  });

  await prisma.blogPost.createMany({
    data: [
      {
        slug: "5-phut-moi-ngay",
        title: "Học tiếng Anh 5 phút mỗi ngày",
        excerpt: "Thói quen nhỏ giúp tiến bộ bền vững.",
        body: "Hãy dành 5 phút mỗi ngày để ôn từ vựng, nghe một đoạn hội thoại ngắn và nói to 3 câu. Sự đều đặn quan trọng hơn học dồn.",
        sortOrder: 1,
      },
      {
        slug: "luyen-nghe-lop-1",
        title: "Mẹo luyện nghe cho Lớp 1",
        excerpt: "Nghe chậm, nhắc lại, rồi tăng tốc.",
        body: "Bắt đầu với hội thoại 2–3 câu. Nghe không nhìn phụ đề lần 1, sau đó đọc transcript và nhắc lại theo giọng mẫu.",
        sortOrder: 2,
      },
      {
        slug: "phonics-co-ban",
        title: "Phonics cơ bản cho người mới",
        excerpt: "Ghép âm để đọc từ thay vì học thuộc lòng.",
        body: "Học 26 chữ cái và các âm phổ biến (a, e, i, o, u). Thực hành ghép CVC như cat, pen, sit.",
        sortOrder: 3,
      },
    ],
  });

  console.log(
    "Seed completed: demo user + Lớp 1–9 + practice/exam/stories/vocab/blog",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
