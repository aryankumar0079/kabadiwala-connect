from app.database.session import SessionLocal
from app.models.user import User
from app.auth.password import hash_password


db = SessionLocal()


admin = User(
    name="System Admin",
    email="admin@kabadiwalaconnect.com",
    mobile="9999999999",
    password_hash=hash_password("Admin@12345"),
    role="admin",
    status="active"
)


db.add(admin)
db.commit()
db.refresh(admin)


print("Admin created successfully")
print("Admin ID:", admin.id)


db.close()