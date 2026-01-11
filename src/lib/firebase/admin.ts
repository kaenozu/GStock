import admin from 'firebase-admin';

const serviceAccount: any = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_ID}`,
};

const firebaseConfig = {
    credential: admin.credential.cert(serviceAccount),
};

if (!admin.apps.length) {
    admin.initializeApp(firebaseConfig);
}

export const firebaseAdmin = admin;

export const messaging = admin.messaging();