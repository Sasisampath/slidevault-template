// server.js  —  SlideVault Backend  (Node.js + Express + MongoDB)
// ================================================================
require('dotenv').config();

const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const path         = require('path');
const multer       = require('multer');
const fs           = require('fs');
const Presentation = require('./models/Presentation');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
// Serve uploaded presentation files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

// ── Multer  (file upload config) ──────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.ppt', '.pptx', '.pdf', '.key'];
  allowed.includes(path.extname(file.originalname).toLowerCase())
    ? cb(null, true)
    : cb(new Error('Only .ppt .pptx .pdf .key files allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// ── MongoDB connection ────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅  MongoDB connected to:', mongoose.connection.host);
    await seedDatabase();
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    console.error('    Check your MONGO_URI in .env file');
    process.exit(1);
  });

// ── Seed data (runs only when DB is empty) ────────────────────
async function seedDatabase() {
  const count = await Presentation.countDocuments();
  if (count > 0) { console.log(`ℹ️   Database already has ${count} presentations — skipping seed`); return; }

  await Presentation.insertMany([
    { title:'Introduction to Machine Learning', author:'Dr. Amandeep Kaur', institution:'Daviet University', cat:'cs', desc:'A comprehensive intro to supervised and unsupervised ML. Covers regression, classification, clustering, and neural networks with Python examples.', tags:['AI','Python','Neural Networks'], slideCount:32, downloads:502, views:1201, likes:94 },
    { title:'Data Structures & Algorithms — Complete Guide', author:'Prof. Ajai Reddy', institution:'Lovely Professional University', cat:'cs', desc:'Every major DS and algorithm from arrays to graph algorithms. Includes time complexity analysis and interview problem walkthroughs.', tags:['DSA','LeetCode','Competitive Programming'], slideCount:58, downloads:712, views:1890, likes:134 },
    { title:'Calculus for Engineers — Limits to Integration', author:'Dr. Irfan Ahmad Wani', institution:'Lovely Professional University', cat:'math', desc:'Rigorous treatment of differential and integral calculus with engineering applications. Includes solved examples and visual proofs.', tags:['Calculus','Differentiation','Integration'], slideCount:44, downloads:302, views:876, likes:61 },
    { title:'Quantum Mechanics Fundamentals', author:'Prof. Ramesh Iyer', institution:'IIT Delhi', cat:'physics', desc:'Wave-particle duality, Schrödinger equation, uncertainty principle, and quantum states. A graduate-level introduction.', tags:['Quantum','Wave Function','Heisenberg'], slideCount:38, downloads:198, views:654, likes:43 },
    { title:'Startup Strategy & Business Model Canvas', author:'Kavya Mittal', institution:'IIM Ahmedabad', cat:'business', desc:'How to design and validate a startup business model. Covers BMC, customer discovery, MVP, and go-to-market strategy.', tags:['Startup','BMC','Strategy','MVP'], slideCount:28, downloads:403, views:1021, likes:87 },
    { title:'CRISPR & Gene Editing Technologies', author:'Dr. Meera Sharma', institution:'AIIMS Delhi', cat:'biology', desc:'Mechanism of CRISPR-Cas9, therapeutic applications, ethical considerations, and current clinical trials overview.', tags:['CRISPR','Genetics','Biotechnology'], slideCount:36, downloads:156, views:489, likes:52 },
    { title:'Operating Systems — Process & Memory Management', author:'Dr. Sachin Chawla', institution:'NIT Jalandhar', cat:'cs', desc:'Process scheduling algorithms, memory management techniques, virtual memory, page replacement algorithms with diagrams.', tags:['OS','Scheduling','Virtual Memory','Paging'], slideCount:47, downloads:534, views:1342, likes:101 },
    { title:'UI/UX Design Principles & Figma Workflow', author:'Sneha Patel', institution:'NID Ahmedabad', cat:'design', desc:'Foundational design principles, Figma prototyping workflow, accessibility standards, and real-world case studies from top products.', tags:['Figma','UX Research','Prototyping','Accessibility'], slideCount:41, downloads:289, views:732, likes:75 },
    { title:'Linear Algebra — Vectors, Matrices & Transformations', author:'Dr. Jyoti Ranjan Yadav', institution:'IIT Kanpur', cat:'math', desc:'Core linear algebra concepts essential for ML and engineering. Eigen vectors, matrix decomposition, and geometric interpretations.', tags:['Linear Algebra','Eigenvalues','SVD','ML Math'], slideCount:35, downloads:261, views:698, likes:58 },
    { title:'Computer Networks & TCP/IP Stack', author:'Dr. Tanvi Mittal', institution:'IIT Delhi', cat:'cs', desc:'OSI model, TCP/IP protocols, routing algorithms, HTTP/HTTPS, DNS, and security. Includes Wireshark demo slides.', tags:['Networking','TCP/IP','HTTP','Security'], slideCount:52, downloads:378, views:945, likes:79 },
    { title:'Behavioral Economics & Decision Making', author:'Dr. Rohan Joshi', institution:'Bits Pilani', cat:'social', desc:'How cognitive biases affect economic decisions. Covers prospect theory, nudge theory, and applications in public policy and marketing.', tags:['Behavioral Econ','Bias','Nudge Theory'], slideCount:30, downloads:167, views:521, likes:44 },
    { title:'Structural Engineering — Load Analysis', author:'Dr. Kirat Singh Sangha', institution:'VIT Velor', cat:'engineering', desc:'Dead loads, live loads, seismic analysis, and structural design principles. Includes case studies of iconic structures.', tags:['Structural','Load Analysis','Seismic','Civil'], slideCount:45, downloads:143, views:412, likes:38 },
  ]);
  console.log('🌱  Database seeded with 12 sample presentations');
}

// ═══════════════════════════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════════════════════════

// ── GET /api/stats ── platform totals
app.get('/api/stats', async (req, res) => {
  try {
    const [total, dlAgg, viewAgg] = await Promise.all([
      Presentation.countDocuments(),
      Presentation.aggregate([{ $group: { _id: null, total: { $sum: '$downloads' } } }]),
      Presentation.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
    ]);
    res.json({
      presentations: total,
      downloads:     dlAgg[0]?.total   || 0,
      views:         viewAgg[0]?.total  || 0,
      categories:    8,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/presentations ── list with optional ?cat=&search=&sort=
app.get('/api/presentations', async (req, res) => {
  try {
    const { cat, search, sort } = req.query;
    const filter = {};

    if (cat && cat !== 'all') filter.cat = cat;
    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { author:      { $regex: search, $options: 'i' } },
        { desc:        { $regex: search, $options: 'i' } },
        { institution: { $regex: search, $options: 'i' } },
        { tags:        { $regex: search, $options: 'i' } },
      ];
    }

    const sortMap = {
      popular:  { downloads: -1 },
      views:    { views:     -1 },
      liked:    { likes:     -1 },
      recent:   { createdAt: -1 },
    };

    const presentations = await Presentation
      .find(filter)
      .sort(sortMap[sort] || { createdAt: -1 });

    res.json(presentations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/presentations/:id ── single record
app.get('/api/presentations/:id', async (req, res) => {
  try {
    const p = await Presentation.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/presentations ── create new (with optional file upload)
app.post('/api/presentations', upload.single('file'), async (req, res) => {
  try {
    const { title, author, institution, cat, desc, access, slideCount } = req.body;
    const tags = req.body.tags
      ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags))
      : [];

    const pres = new Presentation({
      title, author,
      institution: institution || '',
      cat, desc, tags,
      slideCount:  parseInt(slideCount) || 20,
      access:      access || 'free',
      filename:    req.file ? req.file.filename : '',
    });

    await pres.save();
    console.log(`📊  New presentation saved: "${title}" by ${author}`);
    res.status(201).json(pres);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── PATCH /api/presentations/:id/view ── +1 view
app.patch('/api/presentations/:id/view', async (req, res) => {
  try {
    const p = await Presentation.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/presentations/:id/download ── +1 download
app.patch('/api/presentations/:id/download', async (req, res) => {
  try {
    const p = await Presentation.findByIdAndUpdate(
      req.params.id, { $inc: { downloads: 1 } }, { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/presentations/:id/like ── toggle like
//    Body: { action: 'like' | 'unlike' }
app.patch('/api/presentations/:id/like', async (req, res) => {
  try {
    const inc = req.body.action === 'unlike' ? -1 : 1;
    const p = await Presentation.findByIdAndUpdate(
      req.params.id, { $inc: { likes: inc } }, { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/presentations/:id
// ── DELETE /api/presentations/:id
app.delete('/api/presentations/:id', async (req, res) => {
  try {
    const p = await Presentation.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    // Remove uploaded file from disk too
    if (p.filename) {
      const fp = path.join(uploadDir, p.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catch-all: return index.html for all other routes ────────
// ── Catch-all: return index.html for all other routes ────────
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 50MB.' });
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  SlideVault running → http://localhost:${PORT}`);
  console.log(`📁  Uploads folder    → ${uploadDir}`);
  
  console.log(`🗄️   MongoDB URI       → ${process.env.MONGO_URI}\n`);
});
