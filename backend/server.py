from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File as FastAPIFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import os
import logging
from pathlib import Path
import uuid
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Security
security = HTTPBearer()

# File upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ============================================
# MODELS
# ============================================

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    owner_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkspaceMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    user_name: str
    user_email: str
    role: str = "member"  # owner, admin, member
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InviteMember(BaseModel):
    email: EmailStr
    role: str = "member"

class DocumentCreate(BaseModel):
    title: str
    content: Optional[str] = ""

class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    title: str
    content: str
    created_by: str
    created_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class FileMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    name: str
    file_path: str
    size: int
    uploaded_by: str
    uploaded_by_name: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    name: str
    description: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: str = "todo"  # todo, in_progress, done
    priority: str = "medium"  # low, medium, high
    due_date: Optional[datetime] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    created_by: str
    created_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


# ============================================
# AUTHENTICATION HELPERS
# ============================================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if user_doc is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert ISO string to datetime if needed
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)


# ============================================
# AUTH ENDPOINTS
# ============================================

@api_router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        name=user_data.name,
        email=user_data.email
    )
    
    user_dict = user.model_dump()
    user_dict['password_hash'] = get_password_hash(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Convert to User model
    user_doc.pop('password_hash', None)
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    user = User(**user_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ============================================
# USER ENDPOINTS
# ============================================

@api_router.get("/users/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/users/me", response_model=User)
async def update_current_user(update_data: UserUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password_hash": 0})
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    
    return User(**updated_user)


# ============================================
# WORKSPACE ENDPOINTS
# ============================================

@api_router.post("/workspaces", response_model=Workspace, status_code=status.HTTP_201_CREATED)
async def create_workspace(workspace_data: WorkspaceCreate, current_user: User = Depends(get_current_user)):
    workspace = Workspace(
        name=workspace_data.name,
        description=workspace_data.description,
        owner_id=current_user.id
    )
    
    workspace_dict = workspace.model_dump()
    workspace_dict['created_at'] = workspace_dict['created_at'].isoformat()
    
    await db.workspaces.insert_one(workspace_dict)
    
    # Add owner as member
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        user_name=current_user.name,
        user_email=current_user.email,
        role="owner"
    )
    member_dict = member.model_dump()
    member_dict['joined_at'] = member_dict['joined_at'].isoformat()
    await db.workspace_members.insert_one(member_dict)
    
    return workspace

@api_router.get("/workspaces", response_model=List[Workspace])
async def get_workspaces(current_user: User = Depends(get_current_user)):
    # Get all workspaces where user is a member
    memberships = await db.workspace_members.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    workspace_ids = [m['workspace_id'] for m in memberships]
    
    workspaces = await db.workspaces.find({"id": {"$in": workspace_ids}}, {"_id": 0}).to_list(1000)
    
    for workspace in workspaces:
        if isinstance(workspace.get('created_at'), str):
            workspace['created_at'] = datetime.fromisoformat(workspace['created_at'])
    
    return workspaces

@api_router.get("/workspaces/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: str, current_user: User = Depends(get_current_user)):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if isinstance(workspace.get('created_at'), str):
        workspace['created_at'] = datetime.fromisoformat(workspace['created_at'])
    
    return Workspace(**workspace)

@api_router.put("/workspaces/{workspace_id}", response_model=Workspace)
async def update_workspace(workspace_id: str, update_data: WorkspaceCreate, current_user: User = Depends(get_current_user)):
    # Check if user is owner or admin
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member or member['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    await db.workspaces.update_one({"id": workspace_id}, {"$set": update_dict})
    
    workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if isinstance(workspace.get('created_at'), str):
        workspace['created_at'] = datetime.fromisoformat(workspace['created_at'])
    
    return Workspace(**workspace)

@api_router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: str, current_user: User = Depends(get_current_user)):
    # Check if user is owner
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if workspace['owner_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete workspace")
    
    # Delete workspace and all related data
    await db.workspaces.delete_one({"id": workspace_id})
    await db.workspace_members.delete_many({"workspace_id": workspace_id})
    await db.documents.delete_many({"workspace_id": workspace_id})
    await db.files.delete_many({"workspace_id": workspace_id})
    
    # Delete projects and tasks
    projects = await db.projects.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(1000)
    for project in projects:
        await db.tasks.delete_many({"project_id": project['id']})
    await db.projects.delete_many({"workspace_id": workspace_id})
    
    return None

@api_router.post("/workspaces/{workspace_id}/members", response_model=WorkspaceMember, status_code=status.HTTP_201_CREATED)
async def invite_member(workspace_id: str, invite_data: InviteMember, current_user: User = Depends(get_current_user)):
    # Check if user is owner or admin
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member or member['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Find user by email
    invited_user = await db.users.find_one({"email": invite_data.email}, {"_id": 0, "password_hash": 0})
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a member
    existing_member = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "user_id": invited_user['id']
    })
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    # Add member
    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=invited_user['id'],
        user_name=invited_user['name'],
        user_email=invited_user['email'],
        role=invite_data.role
    )
    member_dict = new_member.model_dump()
    member_dict['joined_at'] = member_dict['joined_at'].isoformat()
    await db.workspace_members.insert_one(member_dict)
    
    return new_member

@api_router.get("/workspaces/{workspace_id}/members", response_model=List[WorkspaceMember])
async def get_workspace_members(workspace_id: str, current_user: User = Depends(get_current_user)):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    members = await db.workspace_members.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(1000)
    
    for m in members:
        if isinstance(m.get('joined_at'), str):
            m['joined_at'] = datetime.fromisoformat(m['joined_at'])
    
    return members

@api_router.delete("/workspaces/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(workspace_id: str, user_id: str, current_user: User = Depends(get_current_user)):
    # Check if user is owner or admin
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member or member['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Can't remove owner
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if workspace['owner_id'] == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove workspace owner")
    
    await db.workspace_members.delete_one({"workspace_id": workspace_id, "user_id": user_id})
    return None


# ============================================
# DOCUMENT ENDPOINTS
# ============================================

@api_router.post("/workspaces/{workspace_id}/documents", response_model=Document, status_code=status.HTTP_201_CREATED)
async def create_document(workspace_id: str, doc_data: DocumentCreate, current_user: User = Depends(get_current_user)):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    document = Document(
        workspace_id=workspace_id,
        title=doc_data.title,
        content=doc_data.content or "",
        created_by=current_user.id,
        created_by_name=current_user.name
    )
    
    doc_dict = document.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
    
    await db.documents.insert_one(doc_dict)
    
    return document

@api_router.get("/workspaces/{workspace_id}/documents", response_model=List[Document])
async def get_documents(workspace_id: str, current_user: User = Depends(get_current_user)):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    documents = await db.documents.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(1000)
    
    for doc in documents:
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        if isinstance(doc.get('updated_at'), str):
            doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return documents

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(document_id: str, current_user: User = Depends(get_current_user)):
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": document['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    if isinstance(document.get('created_at'), str):
        document['created_at'] = datetime.fromisoformat(document['created_at'])
    if isinstance(document.get('updated_at'), str):
        document['updated_at'] = datetime.fromisoformat(document['updated_at'])
    
    return Document(**document)

@api_router.put("/documents/{document_id}", response_model=Document)
async def update_document(document_id: str, update_data: DocumentUpdate, current_user: User = Depends(get_current_user)):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": document['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.documents.update_one({"id": document_id}, {"$set": update_dict})
    
    updated_doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if isinstance(updated_doc.get('created_at'), str):
        updated_doc['created_at'] = datetime.fromisoformat(updated_doc['created_at'])
    if isinstance(updated_doc.get('updated_at'), str):
        updated_doc['updated_at'] = datetime.fromisoformat(updated_doc['updated_at'])
    
    return Document(**updated_doc)

@api_router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str, current_user: User = Depends(get_current_user)):
    document = await db.documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check membership and ownership
    member = await db.workspace_members.find_one({
        "workspace_id": document['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Only creator or admin/owner can delete
    if document['created_by'] != current_user.id and member['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    await db.documents.delete_one({"id": document_id})
    return None


# ============================================
# FILE ENDPOINTS
# ============================================

@api_router.post("/workspaces/{workspace_id}/files", response_model=FileMetadata, status_code=status.HTTP_201_CREATED)
async def upload_file(
    workspace_id: str,
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_user)
):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Create unique filename
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    unique_filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Create file metadata
    file_metadata = FileMetadata(
        id=file_id,
        workspace_id=workspace_id,
        name=file.filename,
        file_path=str(file_path),
        size=file_size,
        uploaded_by=current_user.id,
        uploaded_by_name=current_user.name
    )
    
    file_dict = file_metadata.model_dump()
    file_dict['uploaded_at'] = file_dict['uploaded_at'].isoformat()
    
    await db.files.insert_one(file_dict)
    
    return file_metadata

@api_router.get("/workspaces/{workspace_id}/files", response_model=List[FileMetadata])
async def get_files(workspace_id: str, current_user: User = Depends(get_current_user)):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    files = await db.files.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(1000)
    
    for f in files:
        if isinstance(f.get('uploaded_at'), str):
            f['uploaded_at'] = datetime.fromisoformat(f['uploaded_at'])
    
    return files

@api_router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(file_id: str, current_user: User = Depends(get_current_user)):
    file_doc = await db.files.find_one({"id": file_id})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": file_doc['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Only uploader or admin/owner can delete
    if file_doc['uploaded_by'] != current_user.id and member['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Delete physical file
    file_path = Path(file_doc['file_path'])
    if file_path.exists():
        file_path.unlink()
    
    await db.files.delete_one({"id": file_id})
    return None


# ============================================
# PROJECT ENDPOINTS
# ============================================

@api_router.post("/workspaces/{workspace_id}/projects", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(workspace_id: str, project_data: ProjectCreate, current_user: User = Depends(get_current_user)):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    project = Project(
        workspace_id=workspace_id,
        name=project_data.name,
        description=project_data.description,
        created_by=current_user.id,
        created_by_name=current_user.name
    )
    
    project_dict = project.model_dump()
    project_dict['created_at'] = project_dict['created_at'].isoformat()
    
    await db.projects.insert_one(project_dict)
    
    return project

@api_router.get("/workspaces/{workspace_id}/projects", response_model=List[Project])
async def get_projects(workspace_id: str, current_user: User = Depends(get_current_user)):
    # Check membership
    member = await db.workspace_members.find_one({"workspace_id": workspace_id, "user_id": current_user.id})
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    projects = await db.projects.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(1000)
    
    for proj in projects:
        if isinstance(proj.get('created_at'), str):
            proj['created_at'] = datetime.fromisoformat(proj['created_at'])
    
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    
    return Project(**project)

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, update_data: ProjectUpdate, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    await db.projects.update_one({"id": project_id}, {"$set": update_dict})
    
    updated_project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if isinstance(updated_project.get('created_at'), str):
        updated_project['created_at'] = datetime.fromisoformat(updated_project['created_at'])
    
    return Project(**updated_project)

@api_router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member or member['role'] not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Delete project and all tasks
    await db.tasks.delete_many({"project_id": project_id})
    await db.projects.delete_one({"id": project_id})
    
    return None


# ============================================
# TASK ENDPOINTS
# ============================================

@api_router.post("/projects/{project_id}/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(project_id: str, task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    # Check project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Get assigned user name if assigned
    assigned_to_name = None
    if task_data.assigned_to:
        assigned_user = await db.users.find_one({"id": task_data.assigned_to}, {"_id": 0})
        if assigned_user:
            assigned_to_name = assigned_user['name']
    
    task = Task(
        project_id=project_id,
        title=task_data.title,
        description=task_data.description,
        assigned_to=task_data.assigned_to,
        assigned_to_name=assigned_to_name,
        status=task_data.status,
        priority=task_data.priority,
        due_date=task_data.due_date,
        created_by=current_user.id,
        created_by_name=current_user.name
    )
    
    task_dict = task.model_dump()
    task_dict['created_at'] = task_dict['created_at'].isoformat()
    if task_dict['due_date']:
        task_dict['due_date'] = task_dict['due_date'].isoformat()
    
    await db.tasks.insert_one(task_dict)
    
    return task

@api_router.get("/projects/{project_id}/tasks", response_model=List[Task])
async def get_tasks(project_id: str, current_user: User = Depends(get_current_user)):
    # Check project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check membership
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    tasks = await db.tasks.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    for task in tasks:
        if isinstance(task.get('created_at'), str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if task.get('due_date') and isinstance(task['due_date'], str):
            task['due_date'] = datetime.fromisoformat(task['due_date'])
    
    return tasks

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check project and membership
    project = await db.projects.find_one({"id": task['project_id']})
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    if isinstance(task.get('created_at'), str):
        task['created_at'] = datetime.fromisoformat(task['created_at'])
    if task.get('due_date') and isinstance(task['due_date'], str):
        task['due_date'] = datetime.fromisoformat(task['due_date'])
    
    return Task(**task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, update_data: TaskUpdate, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check project and membership
    project = await db.projects.find_one({"id": task['project_id']})
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    update_dict = {}
    for k, v in update_data.model_dump().items():
        if v is not None:
            if k == 'due_date' and isinstance(v, datetime):
                update_dict[k] = v.isoformat()
            else:
                update_dict[k] = v
    
    # Update assigned_to_name if assigned_to changed
    if 'assigned_to' in update_dict and update_dict['assigned_to']:
        assigned_user = await db.users.find_one({"id": update_dict['assigned_to']}, {"_id": 0})
        if assigned_user:
            update_dict['assigned_to_name'] = assigned_user['name']
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_dict})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(updated_task.get('created_at'), str):
        updated_task['created_at'] = datetime.fromisoformat(updated_task['created_at'])
    if updated_task.get('due_date') and isinstance(updated_task['due_date'], str):
        updated_task['due_date'] = datetime.fromisoformat(updated_task['due_date'])
    
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check project and membership
    project = await db.projects.find_one({"id": task['project_id']})
    member = await db.workspace_members.find_one({
        "workspace_id": project['workspace_id'],
        "user_id": current_user.id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    await db.tasks.delete_one({"id": task_id})
    return None


# ============================================
# INCLUDE ROUTER & MIDDLEWARE
# ============================================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
