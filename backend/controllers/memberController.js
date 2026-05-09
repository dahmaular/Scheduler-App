const Member = require('../models/Member');

// GET /api/members
exports.getMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ name: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/members/:id
exports.getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/members
exports.createMember = async (req, res) => {
  try {
    const member = await Member.create(req.body);
    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/members/:id
exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/members/:id
exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/members/bulk-upload
// Body: { csv: "<raw csv string>" }
// Accepts columns (case-insensitive, order-independent):
//   name* | email | phone | isActive  (* required)
// Rows whose name matches an existing member are UPDATED (email/phone/isActive).
// New names are INSERTED.
// Returns: { inserted, updated, skipped, errors: [{ row, name, reason }] }
exports.bulkUpload = async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ message: 'csv field is required in the request body' });
    }

    // ── Parse CSV ──────────────────────────────────────────────────────────
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV must have a header row and at least one data row' });
    }

    // Parse a single CSV line respecting quoted fields
    const parseLine = (line) => {
      const fields = [];
      let cur = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          fields.push(cur.trim()); cur = '';
        } else {
          cur += ch;
        }
      }
      fields.push(cur.trim());
      return fields;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));

    const nameIdx     = headers.indexOf('name');
    const emailIdx    = headers.indexOf('email');
    const phoneIdx    = headers.indexOf('phone');
    const activeIdx   = headers.findIndex((h) => h === 'isactive' || h === 'active');

    if (nameIdx === -1) {
      return res.status(400).json({ message: 'CSV must contain a "name" column' });
    }

    // ── Process rows ───────────────────────────────────────────────────────
    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseLine(lines[i]);
      const name   = fields[nameIdx]?.trim();

      if (!name) {
        errors.push({ row: i + 1, name: '', reason: 'Name is empty — row skipped' });
        continue;
      }

      const activeRaw = activeIdx !== -1 ? fields[activeIdx]?.trim().toLowerCase() : 'true';
      const isActive  = activeRaw === '' || activeRaw === 'true' || activeRaw === '1' || activeRaw === 'yes';

      rows.push({
        name,
        email:    emailIdx !== -1 ? (fields[emailIdx]?.trim() || '') : '',
        phone:    phoneIdx !== -1 ? (fields[phoneIdx]?.trim() || '') : '',
        isActive,
      });
    }

    if (!rows.length) {
      return res.status(400).json({ message: 'No valid rows found in CSV', errors });
    }

    // ── Upsert by name (case-insensitive) ──────────────────────────────────
    let inserted = 0, updated = 0, skipped = 0;

    for (const row of rows) {
      try {
        const existing = await Member.findOne({
          name: { $regex: new RegExp(`^${row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });

        if (existing) {
          await Member.findByIdAndUpdate(existing._id, {
            email:    row.email    || existing.email,
            phone:    row.phone    || existing.phone,
            isActive: row.isActive,
          }, { runValidators: true });
          updated++;
        } else {
          await Member.create(row);
          inserted++;
        }
      } catch (err) {
        errors.push({ row: rows.indexOf(row) + 2, name: row.name, reason: err.message });
        skipped++;
      }
    }

    return res.json({ inserted, updated, skipped, errors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

