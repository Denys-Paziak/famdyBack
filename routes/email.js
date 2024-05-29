const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/send-email', async (req, res) => {
    const { subject, message } = req.body;

    try {
        const response = await axios.post('http://2945689.ni514080.web.hosting-test.net', {
            recipient: "denispaziak@gmail.com",
            subject,
            message
        });

        if (response.data.status === 'success') {
            res.send(response.data.message);
        } else {
            res.status(500).send('Error sending email');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email');
    }
});

module.exports = router;
