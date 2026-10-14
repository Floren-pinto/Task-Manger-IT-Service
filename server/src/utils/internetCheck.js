import { networkInterfaces } from "os";

export const testConnection = () => {
  const netIn = networkInterfaces();
  let isOnline = false;

  for (const key of Object.keys(netIn)) {
    netIn[key].map((obj) => {
      if (obj.mac !== "00:00:00:00:00:00") return (isOnline = true);
    });
  }

  return isOnline;
};
