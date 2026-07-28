    from pydantic import BaseModel
    from uuid import UUID

    class QuestionPoolCreate(BaseModel):
        title: str
        description: str

    class QuestionPoolUpdate(BaseModel):
        title: str
        description: str