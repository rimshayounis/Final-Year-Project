import React from 'react';
import { useNavigation } from '@react-navigation/native';
import ProfileScreen from './ProfileScreen';

interface Props {
  route: { params: { userId: string; myUserId: string } };
}

export default function UserProfileViewScreen({ route }: Props) {
  const { userId, myUserId } = route.params;
  const navigation = useNavigation<any>();

  return (
    <ProfileScreen
      id={userId}
      role="user"
      isOwner={false}
      viewerId={myUserId}
      viewerRole="user"
      onBack={() => navigation.goBack()}
    />
  );
}
