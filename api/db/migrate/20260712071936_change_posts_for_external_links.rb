class ChangePostsForExternalLinks < ActiveRecord::Migration[7.2]
  def change
    remove_column :posts, :body, :text
    remove_column :posts, :status, :string   # 実際の型に合わせる（integerならinteger）

    add_column :posts, :url, :string, null: false
    add_column :posts, :description, :text
    add_column :posts, :published, :boolean, default: false, null: false
  end
end