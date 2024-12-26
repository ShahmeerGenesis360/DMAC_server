import { User } from "../models/user";

const UserService = () => {
  const getUserById = async (id: string) => {
    return User.findById(id);
  };
  return {
    getUserById,
  };
};

export default UserService;
