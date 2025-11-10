#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Simple .env.local parser (avoids adding dotenv as dependency)
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envRaw = fs.readFileSync(envPath, 'utf8');
    envRaw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      // Remove surrounding quotes if present
      process.env[key] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    });
  }
} catch (e) {
  // ignore
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env.local');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: undefined });
    console.log('Connected to MongoDB');

    const QuestionnaireSchema = new mongoose.Schema({
      externalId: { type: String, required: true, unique: false },
      title: { type: String, required: true },
      responses: [
        {
          question: { type: String, required: true },
          answer: { type: mongoose.Schema.Types.Mixed, required: true },
          category: { type: String },
        },
      ],
      fetchedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['pending','analyzed','error'], default: 'pending' },
    }, { timestamps: true });

    const Questionnaire = mongoose.models.Questionnaire || mongoose.model('Questionnaire', QuestionnaireSchema);

    const doc = new Questionnaire({
      externalId: `DEV-PHYSICAL-${Date.now()}`,
      title: 'Physical Security Assessment - Seed (Test)',
      responses: [
        { question: 'Are all data center entry points protected by controlled access systems?', answer: 'Partially Implemented' },
        { question: 'Is CCTV installed to cover all critical areas and are video recordings retained as per policy?', answer: 'Yes' },
        { question: 'Are biometric or smart card authentication systems used for personnel access?', answer: 'No' },
        { question: 'Are visitor entries and exits logged, monitored and reviewed regularly?', answer: 'Yes' },
      ],
      fetchedAt: new Date(),
      status: 'pending',
    });

    const saved = await doc.save();
    console.log('Seeded questionnaire ID:', saved._id.toString());
    console.log(JSON.stringify(saved, null, 2));

    await mongoose.disconnect();
    console.log('Disconnected');
  } catch (err) {
    console.error('Seeding error:', err);
    try { await mongoose.disconnect(); } catch(e) {}
    process.exit(1);
  }
}

run();
