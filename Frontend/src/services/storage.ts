import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'user';

export const storeUser = async (user: any) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

export const getUserId = async (): Promise<string | null> => {
  const userString = await AsyncStorage.getItem('user');
  if (!userString) return null;
  const user = JSON.parse(userString);
  return user?._id ?? null; // this is your userId
};


// Get full user object
export const getUser = async (): Promise<any | null> => {
  try {
    const userString = await AsyncStorage.getItem(USER_KEY);
    return userString ? JSON.parse(userString) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};



// Clear user data (for logout)
export const clearUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error clearing user:', error);
  }
};
