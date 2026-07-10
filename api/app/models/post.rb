class Post < ApplicationRecord
  belongs_to :user
  enum :status, { draft: 0, published: 1 }
  validates :title, presence: true
  scope :published, -> { where(status: :published).order(published_at: :desc) }
end
