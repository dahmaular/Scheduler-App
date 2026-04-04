const express = require('express');
const router = express.Router();
const {
  getSchedules,
  getSlots,
  getScheduleNames,
  deleteScheduleName,
  createSchedule,
  deleteSchedule,
  deletePeriod,
  autoGenerate,
  getMonthlySummary,
} = require('../controllers/scheduleController');

router.get('/slots', getSlots);
router.get('/summary', getMonthlySummary);
router.get('/names', getScheduleNames);
router.get('/', getSchedules);
router.post('/', createSchedule);
router.post('/auto-generate', autoGenerate);
router.delete('/period/:periodKey', deletePeriod);
router.delete('/name/:scheduleName', deleteScheduleName);
router.delete('/:id', deleteSchedule);

module.exports = router;
