import { createContext, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import secureLocalStorage from "react-secure-storage";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isLoading, setLoading] = useState(true);
  const [userSetting, setUserSetting] = useState({});
  const [background, setBackground] = useState();
  const [userData, setUserData] = useState();
  const [username, setUsername] = useState();
  const [email, setUseremail] = useState();
  const [avatar, setAvatar] = useState(null);
  const [updateProfile, showUpdateProfile] = useState(false);
  const [friendList, setFriendList] = useState();
  const [notification, setNotification] = useState([]);
  const [countNotification, setCountNotification] = useState(0);

  const socketRef = useRef();

  const navigate = useNavigate();

  const initSocket = async () => {
    socketRef.current = io("http://localhost:3333");
    socketRef.current.emit("add_user_online", {
      user_id: userData.id,
      username: userData.username,
    });
    socketRef.current.on("connect", () => {
      /*  alert("OK") */
    });
    socketRef.current.on("server_msg", (data) => {
      alert(data);
    });
    socketRef.current.on("accepted_request", (data) => {
      loadNotification();
      loadFriendList();
    });
    socketRef.current.on("new_notification", (data) => {
      loadNotification();
    });
    socketRef.current.on("is_sent_request", (data) => {
      alert("This user sent you a friend request");
    });

    socketRef.current.on("is_read_notification", (data) => {
      setCountNotification(0);
    });
  };

  useEffect(() => {
    if (userData) {
      initSocket();
      loadNotification();
      loadSetting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  useEffect(() => {
    const count = notification.filter((obj) => obj.isRead === 0).length;
    setCountNotification(count);
  }, [notification]);

  const loadSetting = () => {
    const settingEncoded = userData.setting;
    const userSettings = atob(settingEncoded);
    if (JSON.parse(userSettings).avatar !== "") {
      setAvatar(
        `${process.env.REACT_APP_CDN_URL}/images/avatar${
          JSON.parse(userSettings).avatar
        }`
      );
    } else {
      showUpdateProfile(true);
    }
    setUsername(userData.username);
    setUseremail(userData.email);
    setUserSetting(JSON.parse(userSettings));
    setBackground(JSON.parse(userSettings).theme);
    loadFriendList();
  };

  const loadUserData = async () => {
    const token = secureLocalStorage.getItem("accessToken");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    await axios
      .get(`${process.env.REACT_APP_API_ENDPOINT}/getUserData`, config)
      .then(function (response) {
        setUserData(response.data);
      })
      .catch(function (error) {
        navigate("/login");
      });
  };

  const loadFriendList = async () => {
    const token = secureLocalStorage.getItem("accessToken");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    await axios
      .get(`${process.env.REACT_APP_API_ENDPOINT}/getFriendList`, config)
      .then(function (response) {
        setFriendList(response.data);
        setLoading(false);
      })
      .catch(function (error) {
        navigate("/login");
      });
  };

  const loadNotification = async () => {
    const token = secureLocalStorage.getItem("accessToken");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    await axios
      .get(`${process.env.REACT_APP_API_ENDPOINT}/getNotification`, config)
      .then(function (response) {
        setNotification(response.data.notification);
      })
      .catch(function (error) {
        navigate("/login");
      });
  };

  const readNotification = async () => {
    socketRef.current.emit("read_notification", { userId: userData.id });
  };

  const SaveSetting = async (setting) => {
    const token = secureLocalStorage.getItem("accessToken");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    await axios
      .put(
        `${process.env.REACT_APP_API_ENDPOINT}/updateSetting`,
        { setting: JSON.stringify(setting) },
        config
      )
      .then((res) => {
        setUserSetting(setting);
        setBackground(userSetting.theme);
        setAvatar(
          `${process.env.REACT_APP_CDN_URL}/images/avatar${userSetting.avatar}`
        );
      })
      .catch((err) => {
        alert("Failed");
      });
  };

  const uploadImage = async (image) => {
    const token = secureLocalStorage.getItem("accessToken");
    const formData = new FormData();
    formData.append("upload_file", image);
    const config = {
      method: "post",
      url: `${process.env.REACT_APP_API_ENDPOINT}/upload`,
      data: formData,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    return await axios(config)
      .then(async (res) => {
        userSetting.avatar = `/${res.data.upload.filedir}`;
        await SaveSetting(userSetting);
        return true;
      })
      .catch((err) => {
        alert("Upload failed!");
        return false;
      });
  };

  const addFriend = async (to_user_id) => {
    const settingEncoded = userData.setting;
    const userSettings = atob(settingEncoded);
    socketRef.current.emit("add_friend", {
      to_user_id: to_user_id,
      from_user_id: userData.id,
      user_avatar: JSON.parse(userSettings).avatar,
      from_user: userData.username,
    });
  };

  const deleteNotification = async (notifiId) => {
    const token = secureLocalStorage.getItem("accessToken");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    return await axios
      .delete(
        `${process.env.REACT_APP_API_ENDPOINT}/deleteNotification/${notifiId}`,
        config
      )
      .then((res) => {
        /* return true; */
        loadNotification();
      })
      .catch((err) => {
        return false;
      });
  };

  const acceptRequest = async (friendId, username, notifiId) => {
    const settingEncoded = userData.setting;
    const userSettings = atob(settingEncoded);
    const token = secureLocalStorage.getItem("accessToken");
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    await axios
      .post(
        `${process.env.REACT_APP_API_ENDPOINT}/acceptFriend`,
        { friendId: friendId, username: username, notifiId: notifiId },
        config
      )
      .then((res) => {
        if (res?.data?.accept) {
          loadNotification();
          socketRef.current.emit("accept_request", {
            to_user_id: res?.data?.friend_id,
            from_user_id: res?.data?.from_user_id,
            from_user_name: userData.username,
            from_user_avatar: JSON.parse(userSettings).avatar,
          });
        }

        /* alert(res.data); */
      })
      .catch((err) => {
        alert("Failed");
      });
  };

  const value = {
    userSetting,
    userData,
    addFriend,
    username,
    friendList,
    acceptRequest,
    email,
    avatar,
    notification,
    setCountNotification,
    countNotification,
    readNotification,
    deleteNotification,
    showUpdateProfile,
    updateProfile,
    background,
    setUsername,
    setUseremail,
    loadUserData,
    SaveSetting,
    uploadImage,
    isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
