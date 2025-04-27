import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean the database
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.document.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database cleaned. Creating seed data...');

  // Create teachers
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher1 = await prisma.user.create({
    data: {
      email: 'teacher@example.com',
      password: teacherPassword,
      name: 'John Smith',
      role: UserRole.TEACHER,
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 'teacher2@example.com',
      password: teacherPassword,
      name: 'Lisa Johnson',
      role: UserRole.TEACHER,
    },
  });

  console.log(`Teachers created: ${teacher1.email}, ${teacher2.email}`);

  // Create students
  const studentPassword = await bcrypt.hash('student123', 10);
  const student1 = await prisma.user.create({
    data: {
      email: 'student@example.com',
      password: studentPassword,
      name: 'Alex Chen',
      role: UserRole.STUDENT,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@example.com',
      password: studentPassword,
      name: 'Maria Rodriguez',
      role: UserRole.STUDENT,
    },
  });

  console.log(`Students created: ${student1.email}, ${student2.email}`);

  // Create agents for teacher 1
  const physicsAgent = await prisma.agent.create({
    data: {
      name: 'Physics Master',
      subject: 'Physics',
      description: 'Specialized in classical mechanics, thermodynamics, and modern physics',
      teacherId: teacher1.id,
    },
  });

  const mathAgent = await prisma.agent.create({
    data: {
      name: 'Math Wizard',
      subject: 'Mathematics',
      description: 'Expert in calculus, linear algebra, and probability theory',
      teacherId: teacher1.id,
    },
  });

  // Create agents for teacher 2
  const historyAgent = await prisma.agent.create({
    data: {
      name: 'History Guide',
      subject: 'History',
      description: 'Specialized in world history, civilizations, and historical events',
      teacherId: teacher2.id,
    },
  });

  const literatureAgent = await prisma.agent.create({
    data: {
      name: 'Literature Expert',
      subject: 'Literature',
      description: 'Expert in classic and modern literature, poetry, and literary analysis',
      teacherId: teacher2.id,
    },
  });

  console.log('Agents created for teachers');

  // Create chats for student 1
  const physicsChat1 = await prisma.chat.create({
    data: {
      title: 'Understanding Relativity',
      userId: student1.id,
      agentId: physicsAgent.id,
    },
  });

  const mathChat1 = await prisma.chat.create({
    data: {
      title: 'Help with Calculus',
      userId: student1.id,
      agentId: mathAgent.id,
    },
  });

  // Create chats for student 2
  const historyChat1 = await prisma.chat.create({
    data: {
      title: 'Ancient Civilizations',
      userId: student2.id,
      agentId: historyAgent.id,
    },
  });

  const literatureChat1 = await prisma.chat.create({
    data: {
      title: 'Shakespeare Analysis',
      userId: student2.id,
      agentId: literatureAgent.id,
    },
  });

  console.log('Chats created for students');

  // Add example messages to physics chat
  await prisma.message.createMany({
    data: [
      {
        content: "Can you explain Einstein's theory of relativity in simple terms?",
        role: 'USER',
        chatId: physicsChat1.id,
        userId: student1.id,
      },
      {
        content: "Einstein's theory of relativity consists of two parts: Special Relativity and General Relativity.\n\nSpecial Relativity (1905) establishes that:\n1. The laws of physics are the same for all non-accelerating observers.\n2. The speed of light is constant regardless of the observer's motion.\n\nThis leads to fascinating consequences like time dilation (moving clocks run slower) and length contraction (moving objects appear shorter).\n\nGeneral Relativity (1915) extends these ideas to include gravity, describing it not as a force but as a curvature of spacetime caused by mass and energy. This explains why light bends around massive objects like the sun.\n\nA simple way to visualize it: imagine spacetime as a stretched rubber sheet. A heavy ball (like the sun) creates a depression, causing smaller objects (like planets) to orbit around it, not because of a direct 'pull' but because they're following the curved path of spacetime.",
        role: 'ASSISTANT',
        chatId: physicsChat1.id,
      },
      {
        content: "That makes sense! So how does this relate to the famous equation E=mc²?",
        role: 'USER',
        chatId: physicsChat1.id,
        userId: student1.id,
      },
      {
        content: "E=mc² is one of the most profound outcomes of Special Relativity. This elegant equation establishes the relationship between mass (m) and energy (E), with c² being the speed of light squared (a very large number).\n\nWhat it tells us is that mass and energy are equivalent and interchangeable. A small amount of mass can be converted into an enormous amount of energy (since the speed of light squared is such a large multiplier).\n\nThis equivalence explains:\n\n1. Nuclear power and weapons - tiny amounts of mass get converted to huge amounts of energy\n2. The energy source of stars - hydrogen atoms fuse into helium, converting some mass to energy\n3. Particle physics - where we see mass-energy conversions happening constantly\n\nIn essence, Einstein showed us that mass is just highly concentrated energy. This completely changed our understanding of physics, unifying what were previously thought to be separate concepts.",
        role: 'ASSISTANT',
        chatId: physicsChat1.id,
      },
    ],
  });

  // Add example messages to math chat
  await prisma.message.createMany({
    data: [
      {
        content: "I'm struggling to understand how to find the derivative of logarithmic functions. Can you help?",
        role: 'USER',
        chatId: mathChat1.id,
        userId: student1.id,
      },
      {
        content: "I'd be happy to help you understand logarithmic derivatives!\n\nThe basic formula for the derivative of a natural logarithm is:\n\nd/dx[ln(x)] = 1/x\n\nThis is one of the fundamental derivatives in calculus. For other logarithmic functions, we can use the change of base formula. For example:\n\nd/dx[log₁₀(x)] = 1/(x·ln(10))\n\nMore generally, for any base b:\n\nd/dx[log_b(x)] = 1/(x·ln(b))\n\nFor more complex logarithmic functions, we apply the chain rule. If u is a function of x, then:\n\nd/dx[ln(u)] = (1/u) · (du/dx)\n\nLet's work through an example: Find the derivative of f(x) = ln(3x² + 2)\n\nUsing the chain rule:\n1. Let u = 3x² + 2\n2. Then f(x) = ln(u)\n3. f'(x) = (1/u) · (du/dx)\n4. du/dx = 6x\n5. f'(x) = (1/(3x² + 2)) · 6x = 6x/(3x² + 2)\n\nWould you like to try some practice problems?",
        role: 'ASSISTANT',
        chatId: mathChat1.id,
      },
    ],
  });

  // Add example messages to history chat
  await prisma.message.createMany({
    data: [
      {
        content: "What were the main causes of the fall of the Roman Empire?",
        role: 'USER',
        chatId: historyChat1.id,
        userId: student2.id,
      },
      {
        content: "The fall of the Roman Empire wasn't caused by a single factor but rather a complex combination of internal and external pressures that accumulated over centuries. Here are the main causes:\n\n1. **Political Instability**: The 3rd century crisis saw about 26 emperors in 50 years, with most assassinated. This created governmental chaos and weakened central authority.\n\n2. **Economic Troubles**: Several factors contributed to economic decline:\n   - Overreliance on slave labor\n   - Excessive taxation of the middle class\n   - Currency devaluation and inflation\n   - Trade disruptions\n   - Agricultural decline\n\n3. **Military Problems**: The empire became increasingly dependent on Germanic mercenaries who had questionable loyalty. Military effectiveness declined as training standards fell.\n\n4. **External Invasions**: Various groups including Goths, Vandals, Huns, and others increasingly pressured Roman borders, eventually overwhelming defenses.\n\n5. **Division of the Empire**: Splitting into Western and Eastern halves in 395 CE weakened the Western half's resources.\n\n6. **Cultural and Social Factors**:\n   - Declining civic virtue and engagement\n   - Depopulation of certain regions\n   - Religious transitions and conflicts\n\n7. **Environmental Factors**: Evidence suggests climate change and pandemic diseases (like the Plague of Cyprian) significantly impacted population and economic stability.\n\nHistory teaches us that the Western Roman Empire gradually dissolved over decades, with 476 CE (the deposition of Romulus Augustus) typically marked as the traditional end date, though many Roman institutions persisted for centuries. The Eastern Empire (Byzantine) continued until 1453.\n\nWhich of these factors would you like to explore in more depth?",
        role: 'ASSISTANT',
        chatId: historyChat1.id,
      },
    ],
  });

  // Add example messages to literature chat
  await prisma.message.createMany({
    data: [
      {
        content: "What makes Hamlet such an important work in English literature?",
        role: 'USER',
        chatId: literatureChat1.id,
        userId: student2.id,
      },
      {
        content: "Hamlet stands as one of the most significant works in English literature for multiple compelling reasons:\n\n1. **Psychological Depth**: Shakespeare created perhaps literature's most complex character in Hamlet. His internal struggles, philosophical questioning, and psychological complexity make him remarkably modern. The play's exploration of consciousness and self-doubt was revolutionary for its time.\n\n2. **Language and Rhetoric**: Hamlet contains some of the most quoted lines in English literature (\"To be or not to be,\" \"The play's the thing,\" etc.). Shakespeare's linguistic innovation reaches its peak with sophisticated wordplay, metaphors, and soliloquies that reveal character psychology.\n\n3. **Philosophical Weight**: The play grapples with profound existential questions about mortality, meaning, action vs. inaction, appearance vs. reality, and the limits of human understanding. Hamlet's contemplations on death and the purpose of existence continue to resonate deeply.\n\n4. **Dramatic Innovation**: Shakespeare brilliantly employs devices like the play-within-a-play, metatheatrical commentary, and structural parallelism. The ghost serves both supernatural and psychological functions, creating interpretive richness.\n\n5. **Cultural Impact**: Hamlet has been continuously performed for over 400 years and has influenced countless writers, philosophers, and artists. Freud used Hamlet to develop psychoanalytic theories, while innumerable adaptations exist across media and cultures.\n\n6. **Thematic Universality**: The play explores timeless themes: family dynamics, political corruption, grief, revenge, madness, love, betrayal, and moral ambiguity. This allows each generation to find relevant meaning in the text.\n\n7. **Ambiguity and Interpretive Openness**: The play deliberately resists simple interpretation. Is Hamlet truly mad? Is the ghost real? Is Hamlet's inaction due to moral qualms or cowardice? This ambiguity ensures the play remains intellectually stimulating across centuries.\n\nHamlet marks a pivotal moment in Western literature where character development and psychological realism took precedence, influencing nearly every dramatic work that followed. Would you like to explore any specific aspect of the play in greater detail?",
        role: 'ASSISTANT',
        chatId: literatureChat1.id,
      },
    ],
  });

  console.log('Example messages created for chats');

  console.log('Seed data created successfully:');
  console.log('- 2 Teachers and 2 Students');
  console.log('- 4 Agents (Physics, Math, History, Literature)');
  console.log('- 4 Chats with example conversations');
  console.log('\nLogin credentials:');
  console.log('- Teacher: teacher@example.com (password: teacher123)');
  console.log('- Student: student@example.com (password: student123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });