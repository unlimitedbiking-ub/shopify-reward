import prisma from "../../db.server";

export const createCategory = async (data) => {
  const { name, eliteGrossMargin, regularGrossMargin, collectionId } = data;
  if (!name || isNaN(eliteGrossMargin) || isNaN(regularGrossMargin)) {
    throw new Error("All fields are required.");
  }

  return await prisma?.category?.create({
    data: { name, eliteGrossMargin, regularGrossMargin, collectionId },
  });
};

export const updateCategory = async (id, data) => {
  const { name, eliteGrossMargin, regularGrossMargin, collectionId } = data;
  if (!id || !name || isNaN(eliteGrossMargin) || isNaN(regularGrossMargin)) {
    throw new Error("All fields are required for update.");
  }

  return await prisma?.category?.update({
    where: { id: id },
    data: { name, eliteGrossMargin, regularGrossMargin, collectionId },
  });
};

export const deleteCategory = async (id) => {
  if (!id) {
    throw new Error("Category ID is required.");
  }

  return await prisma?.category?.delete({
    where: { id: id },
  });
};

export const getAllCategories = async () => {
  return await prisma?.category?.findMany();
};
