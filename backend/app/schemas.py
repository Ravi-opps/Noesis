from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    profession: str
    company: str


class RAGSearchRequest(BaseModel):
    search: str


class RAGPoint(BaseModel):
    title: str = Field(description="Short heading for the insight")
    details: str = Field(description="Detailed explanation of the point")
    evidence: list[str] = Field(default_factory=list, description="Direct evidence snippets from retrieved context")


class RAGSuggestion(BaseModel):
    title: str = Field(description="Short technical suggestion heading")
    details: str = Field(description="Technical rationale and expected impact")
    technical_actions: list[str] = Field(
        default_factory=list,
        description="Concrete engineering implementation actions",
    )
    addresses: list[str] = Field(
        default_factory=list,
        description="Negative point titles this suggestion addresses",
    )
    evidence: list[str] = Field(default_factory=list, description="Direct evidence snippets from retrieved context")


class RAGSearchResponse(BaseModel):
    search: str
    sufficient_info: bool
    message: str
    positives: list[RAGPoint]
    negatives: list[RAGPoint]
    suggestions: list[RAGSuggestion] = Field(default_factory=list)
