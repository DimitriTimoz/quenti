import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const insaAuthEmail = (req.headers["x-insa-auth-email"] as string) || null;
  const insaAuthUid = (req.headers["x-insa-auth-uid"] as string) || null;

  res.status(200).json({
    email: insaAuthEmail,
    uid: insaAuthUid,
  });
}
