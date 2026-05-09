const express = require('express');
const router = express.Router();
const {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  bulkUpload,
} = require('../controllers/memberController');

router.get('/',              getMembers);
router.post('/bulk-upload',  bulkUpload);   // must be before /:id
router.get('/:id',           getMember);
router.post('/',             createMember);
router.put('/:id',           updateMember);
router.delete('/:id',        deleteMember);

module.exports = router;
