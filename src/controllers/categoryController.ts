import { Request, Response } from "express";
import { Category } from "../models/category";

const categoryController = () => {
  const createCategory = async (req: Request, res: Response) => {
    try {
      const { value } = req.body;
      if (!value)
        return res.status(400).json({ message: "Category is required" });

      const newCategory = await Category.create({ value });
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ message: "Error saving category", error });
    }
  };

  const getAllCategory = async (req: Request, res: Response) => {
    try {
      const categories = await Category.find().select("value -_id");
      res.status(200).json(categories.map((item) => item.value));
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories", error });
    }
  };

  return {
    createCategory,
    getAllCategory,
  };
};

export default categoryController;
