const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const upload = multer({ storage: multer.memoryStorage() });

const app = express();

// Directly use your OpenAI API key here (replace with your actual key)
const OPENAI_API_KEY = "sk-XXX";

app.use(express.static("public"));
app.use(express.json()); // To parse JSON bodies

app.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No audio file provided.");
    }

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer sk-XXX`,
        },
      }
    );

    res.json({ transcription: response.data });
  } catch (error) {
    console.error("Error transcribing audio:", error.message);
    handleError(error, res);
  }
});

async function categorizeText(text) {
  const prompt = `Categorize the following text:\n${text}`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/engines/text-davinci-003/completions",
      {
        prompt: prompt,
        max_tokens: 50, // Adjust as needed
      },
      {
        headers: {
          Authorization: `Bearer sk-XXX`,
          "Content-Type": "application/json",
        },
      }
    );

    return { success: true, data: response.data.choices[0].text.trim() };
  } catch (error) {
    console.error("Error in categorization:", error);
    return { success: false, error: error.message };
  }
}

app.post("/categorize", async (req, res) => {
  try {
    const text = req.body.text;
    if (!text) {
      return res.status(400).send("No text provided.");
    }

    const result = await categorizeText(text);
    if (result.success) {
      res.json({ categorization: result.data });
    } else {
      res.status(500).send(`Error in categorization: ${result.error}`);
    }
  } catch (error) {
    console.error("Error in categorization:", error.message);
    handleError(error, res);
  }
});

function handleError(error, res) {
  if (error.response) {
    const { status, data } = error.response;
    res.status(status).send(data.message);
  } else if (error.request) {
    res.status(500).send("No response received from API.");
  } else {
    res.status(500).send(`Server Error: ${error.message}`);
  }
}

// Endpoint for image upload
app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No image file provided.");
    }

    // Convert image to base64
    const base64Image = Buffer.from(req.file.buffer).toString("base64");

    // Function call to process the image
    const result = await analyzeImageWithOpenAI(base64Image);
    console.log("Analysis result:", result);
    res.json({ analysis: result });
  } catch (error) {
    console.error("Error processing image:", error.message);
    handleError(error, res);
  }
});

async function analyzeImageWithOpenAI(base64Image) {
  try {
    const payload = {
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What’s in this image?",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    };

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer sk-XXX`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error in image analysis:", error);
    return { success: false, error: error.message };
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started");
});
