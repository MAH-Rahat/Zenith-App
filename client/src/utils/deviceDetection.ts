import * as Device from 'expo-device';

export const isNothingPhone = (): boolean => {
  try {
    const deviceModel = Device.modelName?.toLowerCase() || '';
    const deviceBrand = Device.brand?.toLowerCase() || '';
    
    // Check if device is Nothing Phone 3a
    return (
      deviceBrand.includes('nothing') ||
      deviceModel.includes('nothing') ||
      deviceModel.includes('phone 3a') ||
      deviceModel.includes('phone(3a)')
    );
  } catch (error) {
    console.error('Failed to detect device:', error);
    return false;
  }
};

export const getDeviceInfo = () => {
  return {
    brand: Device.brand,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    isDevice: Device.isDevice,
  };
};
