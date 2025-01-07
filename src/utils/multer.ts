import multer from "multer";
import path from "path";
import fs from "fs";

// Configure Multer to use disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname,"../", "uploads"); // Folder to store images

    // Check if the directory exists, and create it if it doesn't
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Recursive to handle nested directories
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname); // Get file extension
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
  },
});

// Set up the Multer instance
export const upload = multer({ storage });
