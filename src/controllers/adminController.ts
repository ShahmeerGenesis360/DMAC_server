import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin";
import { Request, Response } from "express";

// JWT Secret Key
const JWT_SECRET = "your_secret_key_here"; // Replace with an environment variable in production
const adminController = () => {
  // Signup Admin
  const createAdmin = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new admin
      const newAdmin = new Admin({ email, password: hashedPassword });
      await newAdmin.save();

      res.status(201).json({ message: "Admin created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error creating admin", error });
    }
  };

  // Login Admin
  const getAdmin = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      // Find admin by email
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(500).json({ message: "Invalid credentials" });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: admin._id, email: admin.email },
        JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      res.status(200).json({ message: "Login successful", token });
    } catch (error) {
      res.status(500).json({ message: "Error logging in", error });
    }
  };
  return {
    createAdmin,
    getAdmin,
  };
};

export default adminController;
