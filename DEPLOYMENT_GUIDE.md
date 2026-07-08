# How to Host Your MoM Generator on AWS — Step by Step (Beginner Friendly)

This guide explains everything in plain language, like you've never used AWS before.
We will build 3 things on AWS:

1. **DynamoDB** — a database table that remembers your saved Meeting Minutes (the "history")
2. **S3 bucket #1** — a storage box that keeps the raw meeting transcripts you paste in
3. **EC2 server** — a small computer in the cloud that runs your backend (Node.js) code
4. **S3 bucket #2 (+ static website hosting)** — hosts your frontend (the HTML page) so anyone can open it in a browser

You will need:
- An AWS account (sign up free at https://aws.amazon.com)
- A free Gemini API key from https://aistudio.google.com/app/apikey
- About 45–60 minutes

---

## PART 1 — Create the Database (DynamoDB)

1. Log in to the AWS Console: https://console.aws.amazon.com
2. In the search bar at the top, type **DynamoDB** and click it.
3. Click the orange **Create table** button.
4. Fill in:
   - **Table name**: `MoMHistory`
   - **Partition key**: `id` (type: **String**)
5. Leave everything else as default.
6. Click **Create table** at the bottom. Wait ~30 seconds until status says "Active".

✅ Your database is ready. Remember the table name: `MoMHistory`.

---

## PART 2 — Create the Transcript Storage Bucket (S3)

1. In the search bar, type **S3** and click it.
2. Click **Create bucket**.
3. Bucket name: `mom-generator-transcripts-yourname` (bucket names must be globally unique, so add your name or a random number at the end).
4. Region: pick the same region you'll use everywhere else, e.g. `ap-south-1` (Mumbai).
5. Leave "Block all public access" turned **ON** (checked) — transcripts should stay private.
6. Click **Create bucket**.

✅ Remember this exact bucket name — you'll need it later as `S3_BUCKET`.

---

## PART 3 — Create an IAM Role (so your server is allowed to use DynamoDB & S3)

This step gives your EC2 server "permission" to talk to the database and storage bucket, without needing to paste secret passwords into your code.

1. In the search bar, type **IAM** and click it.
2. On the left menu, click **Roles** → **Create role**.
3. Choose **AWS service** → **EC2** → click **Next**.
4. In the permissions search box, search and check these two policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   (For learning purposes this is simplest. For real production apps, you'd restrict access to just your table/bucket.)
5. Click **Next**. Name the role: `MoMGeneratorServerRole`.
6. Click **Create role**.

✅ Remember this role name: `MoMGeneratorServerRole`.

---

## PART 4 — Launch the Backend Server (EC2)

1. In the search bar, type **EC2** and click it.
2. Click **Launch instance**.
3. Name: `mom-generator-backend`.
4. Choose **Ubuntu** (Ubuntu Server 24.04 LTS, Free tier eligible).
5. Instance type: `t2.micro` (Free tier eligible).
6. **Key pair**: click "Create new key pair", name it `mom-generator-key`, leave defaults, click **Create key pair**. A `.pem` file downloads — keep it safe, you need it to connect later.
7. **Network settings** → click **Edit**:
   - Make sure "Allow SSH traffic" is checked (so you can connect).
   - Click **Add security group rule**:
     - Type: **Custom TCP**, Port range: `4000`, Source: **Anywhere (0.0.0.0/0)** — this lets your frontend talk to the backend.
8. Scroll down to **Advanced details** → find **IAM instance profile** → select `MoMGeneratorServerRole` (the role you made in Part 3).
9. Click **Launch instance**.
10. Wait ~1 minute, then go to **Instances**, click your instance, and copy its **Public IPv4 address** (e.g. `13.234.56.78`). You'll need this!

### Connect to your server

On Mac/Linux, open Terminal. On Windows, use PowerShell or install Git Bash.

```bash
cd path/to/where/you/downloaded/the/key
chmod 400 mom-generator-key.pem
ssh -i "mom-generator-key.pem" ubuntu@YOUR_PUBLIC_IP
```

(Replace `YOUR_PUBLIC_IP` with the address you copied.)

### Install Node.js on the server

Once connected (you'll see `ubuntu@ip-...:~$`), run:

```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

You should see something like `v20.x.x`.

### Upload your backend code

Easiest way: from your **own computer** (a new terminal window, not the SSH one), run this from inside the `mom-generator` folder you downloaded from this chat:

```bash
scp -i "mom-generator-key.pem" -r backend ubuntu@YOUR_PUBLIC_IP:/home/ubuntu/backend
```

### Configure and start the backend

Back in your SSH terminal (connected to EC2):

```bash
cd ~/backend
npm install
cp .env.example .env
nano .env
```

In the editor that opens, fill in:
```
AWS_REGION=ap-south-1
DYNAMODB_TABLE=MoMHistory
S3_BUCKET=mom-generator-transcripts-yourname
GEMINI_API_KEY=your_real_gemini_key_here
PORT=4000
```
(Leave `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` blank — the IAM Role handles that automatically.)

Press `Ctrl+O` then `Enter` to save, `Ctrl+X` to exit.

Now keep the server running even after you disconnect, using `pm2`:

```bash
sudo npm install -g pm2
pm2 start server.js --name mom-backend
pm2 save
pm2 startup
```
(It will print a command — copy and run that exact command it gives you, then run `pm2 save` once more.)

### Test it

From your own computer's browser, go to:
```
http://YOUR_PUBLIC_IP:4000/api/health
```
You should see `{"status":"ok", ...}`. 🎉 Your backend is live!

---

## PART 5 — Host the Frontend (S3 Static Website)

1. Go back to **S3** in the AWS Console.
2. Click **Create bucket**.
3. Bucket name: `mom-generator-frontend-yourname` (must be unique).
4. **Uncheck** "Block all public access" (the frontend needs to be public so visitors can see it). Tick the confirmation checkbox.
5. Click **Create bucket**.
6. Open the bucket → go to the **Properties** tab → scroll to **Static website hosting** → click **Edit**.
   - Enable it.
   - Index document: `index.html`
   - Click **Save changes**.
7. Go to the **Permissions** tab → **Bucket policy** → click **Edit** → paste this (replace `BUCKET_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET_NAME/*"
    }
  ]
}
```
Click **Save changes**.

### Before uploading: point the frontend at your backend

On your own computer, open `frontend/index.html` in a text editor and find this line near the top of the `<script>` section:

```js
const API_BASE_URL = "http://localhost:4000/api";
```

Change it to your EC2 public IP:

```js
const API_BASE_URL = "http://YOUR_PUBLIC_IP:4000/api";
```

Save the file.

### Upload the frontend

1. Back in the S3 bucket, go to the **Objects** tab → click **Upload** → **Add files** → choose your edited `index.html`.
2. Click **Upload**.
3. Go to **Properties** → **Static website hosting** → copy the **Bucket website endpoint** URL (looks like `http://mom-generator-frontend-yourname.s3-website.ap-south-1.amazonaws.com`).

🎉 Open that URL in your browser — your website is live for anyone to use!

---

## PART 6 — Quick Checklist / Troubleshooting

- **"Could not reach backend server"** toast on the website → check that `API_BASE_URL` in `index.html` matches your EC2 public IP exactly, and that port `4000` is open in your EC2 security group.
- **EC2 restarted and lost your server?** → SSH back in and run `pm2 restart mom-backend` (or `pm2 resurrect` if it was stopped).
- **Want a real domain name + HTTPS instead of an IP address?** → Once comfortable, look into **Route 53** (for the domain) and **AWS Certificate Manager + Application Load Balancer** (for HTTPS). This is an extra/advanced step not required to get started.
- **Costs**: `t2.micro` EC2 and a small DynamoDB/S3 usage are covered under the AWS Free Tier for the first 12 months on a new account. Keep an eye on the AWS Billing Dashboard.

---

## Folder Reference (what's in your downloaded project)

```
mom-generator/
├── backend/                 → Node.js + Express API (deploy this to EC2)
│   ├── server.js            → starts the web server
│   ├── routes/mom.js        → all the API endpoints (/generate, /history, ...)
│   ├── services/gemini.js   → talks to Google Gemini to write the minutes
│   ├── services/dynamo.js   → saves/reads history in DynamoDB
│   ├── services/s3.js       → saves/reads transcripts in S3
│   ├── config/aws.js        → sets up the AWS connection
│   ├── package.json         → list of code libraries needed
│   └── .env.example         → copy to .env and fill in your real settings
└── frontend/
    └── index.html           → the website itself (deploy this to S3 static hosting)
```
